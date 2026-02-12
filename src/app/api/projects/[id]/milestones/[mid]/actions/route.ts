import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { createInvoice } from "@/lib/invoices";
import { createNotification, notifyProjectParties } from "@/lib/notifications";
import { fireWebhookEvent } from "@/lib/webhooks";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const FABRIC_STAGES = ["RECEIVED", "SORTING", "WASHING", "DRYING", "PRESSING", "QC_CHECK", "PACKED", "DELIVERED"] as const;

const MILESTONE_KEYWORD_TO_STAGE: Record<string, string> = {
  pickup: "SORTING",
  sort: "SORTING",
  wash: "WASHING",
  dry: "DRYING",
  iron: "PRESSING",
  press: "PRESSING",
  qc: "QC_CHECK",
  quality: "QC_CHECK",
  inspect: "QC_CHECK",
  pack: "PACKED",
  deliver: "DELIVERED",
  dispatch: "DELIVERED",
  ship: "DELIVERED",
};

function inferFabricStage(milestoneTitle: string): string | null {
  const lower = milestoneTitle.toLowerCase();
  let bestStage: string | null = null;
  let bestIdx = -1;
  for (const [keyword, stage] of Object.entries(MILESTONE_KEYWORD_TO_STAGE)) {
    if (lower.includes(keyword)) {
      const idx = FABRIC_STAGES.indexOf(stage as any);
      if (idx > bestIdx) {
        bestIdx = idx;
        bestStage = stage;
      }
    }
  }
  return bestStage;
}

async function advanceFabricItems(projectId: string, targetStage: string, actorId: string) {
  const targetIdx = FABRIC_STAGES.indexOf(targetStage as any);
  if (targetIdx < 0) return;

  const items = await prisma.orderItem.findMany({ where: { projectId } });
  for (const item of items) {
    const currentIdx = FABRIC_STAGES.indexOf(item.currentStage as any);
    if (currentIdx < targetIdx) {
      await prisma.$transaction([
        prisma.orderItem.update({
          where: { id: item.id },
          data: { currentStage: targetStage, currentStageAt: new Date() },
        }),
        prisma.fabricUpdate.create({
          data: { orderItemId: item.id, stage: targetStage, note: "Auto-advanced on milestone release", actorId },
        }),
      ]);
    }
  }
}

const FileSchema = z.object({
  fileName: z.string(),
  sizeBytes: z.number().optional(),
  mimeType: z.string().optional(),
  url: z.string().optional(),
});

const Body = z.object({
  action: z.string(),
  note: z.string().max(4000).optional(),
  releaseAmountRupees: z.string().optional(),
  files: z.array(FileSchema).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const milestone = await prisma.milestone.findUnique({ where: { id: mid }, include: { project: true } });
  if (!milestone || milestone.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const p = milestone.project;
  if (role !== "ADMIN") {
    if (role === "CLIENT" && p.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && p.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const action = parsed.data.action;

  if (action === "fund") {
    if (role !== "CLIENT") return NextResponse.json({ error: "Only clients can fund" }, { status: 403 });
    const isRefund = milestone.status === "FUNDED";
    if (milestone.status !== "DRAFT" && !isRefund) return NextResponse.json({ error: "Milestone not fundable" }, { status: 400 });
    if (isRefund && (!parsed.data.note || !parsed.data.note.trim())) return NextResponse.json({ error: "A note is required when funding again" }, { status: 400 });

    const walletEnabled = await isFeatureEnabled(me.id, "WALLET_ENABLED");

    if (walletEnabled) {
      const wallet = await prisma.wallet.upsert({
        where: { userId: me.id },
        create: { userId: me.id },
        update: {},
      });

      if (wallet.availableCents < milestone.amountCents) {
        return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            availableCents: { decrement: milestone.amountCents },
            heldCents: { increment: milestone.amountCents },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "HOLD",
            amountCents: milestone.amountCents,
            status: "POSTED",
            projectId: milestone.projectId,
            milestoneId: milestone.id,
            note: parsed.data.note ?? "Funds held in escrow.",
          },
        }),
        prisma.milestone.update({ where: { id: milestone.id }, data: { status: "FUNDED", fundedAt: new Date() } }),
        prisma.escrowLedgerEntry.create({ data: { milestoneId: milestone.id, type: "DEPOSIT", amountCents: milestone.amountCents, note: parsed.data.note ?? "Client funded escrow via wallet." } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.milestone.update({ where: { id: milestone.id }, data: { status: "FUNDED", fundedAt: new Date() } }),
        prisma.escrowLedgerEntry.create({ data: { milestoneId: milestone.id, type: "DEPOSIT", amountCents: milestone.amountCents, note: parsed.data.note ?? "Client funded escrow (demo)." } }),
      ]);
    }

    await notifyProjectParties(milestone.projectId, me.id, {
      type: "MILESTONE_FUNDED",
      title: "Milestone Funded",
      body: `"${milestone.title}" has been funded with ${(milestone.amountCents / 100).toFixed(2)} INR.`,
      linkUrl: `/app/projects/${milestone.projectId}`,
    });
    await fireWebhookEvent(p.clientId, "milestone.funded", {
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      title: milestone.title,
      amountCents: milestone.amountCents,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "submit") {
    if (role !== "VENDOR") return NextResponse.json({ error: "Only vendors can submit" }, { status: 403 });
    if (!["FUNDED", "IN_PROGRESS"].includes(milestone.status)) return NextResponse.json({ error: "Not submittable" }, { status: 400 });

    const attachments = (parsed.data.files ?? []).map(f => prisma.fileAttachment.create({
      data: { uploaderId: me.id, fileName: f.fileName, mimeType: f.mimeType ?? null, sizeBytes: f.sizeBytes ?? null, url: f.url ?? null, milestoneId: milestone.id },
    }));

    await prisma.$transaction([
      prisma.milestone.update({ where: { id: milestone.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
      prisma.escrowLedgerEntry.create({ data: { milestoneId: milestone.id, type: "PROOF_SUBMITTED", amountCents: 0, note: parsed.data.note ?? "Proof submitted (demo)." } }),
      ...attachments,
    ]);

    await notifyProjectParties(milestone.projectId, me.id, {
      type: "MILESTONE_SUBMITTED",
      title: "Work Submitted",
      body: `"${milestone.title}" — provider has submitted proof of completion.`,
      linkUrl: `/app/projects/${milestone.projectId}`,
    });
    if (p.vendorId) {
      await fireWebhookEvent(p.vendorId, "milestone.submitted", {
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        title: milestone.title,
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (role !== "CLIENT") return NextResponse.json({ error: "Only clients can approve" }, { status: 403 });
    if (milestone.status !== "SUBMITTED") return NextResponse.json({ error: "Only SUBMITTED can be approved" }, { status: 400 });

    const partialEnabled = await isFeatureEnabled(me.id, "PARTIAL_RELEASE");
    const hasPartialAmount = parsed.data.releaseAmountRupees !== undefined && parsed.data.releaseAmountRupees !== "";
    let releasedAmount = milestone.amountCents - milestone.releasedCents;
    let isPartial = false;

    if (hasPartialAmount && partialEnabled) {
      const partialRupees = parseFloat(parsed.data.releaseAmountRupees!);
      if (!Number.isFinite(partialRupees) || partialRupees <= 0) {
        return NextResponse.json({ error: "Invalid release amount" }, { status: 400 });
      }
      const partialCents = Math.round(partialRupees * 100);
      const remaining = milestone.amountCents - milestone.releasedCents;
      if (partialCents > remaining) {
        return NextResponse.json({ error: "Release amount exceeds remaining balance" }, { status: 400 });
      }
      releasedAmount = partialCents;
      isPartial = (milestone.releasedCents + partialCents) < milestone.amountCents;
    }

    const newReleasedCents = milestone.releasedCents + releasedAmount;
    const fullyReleased = newReleasedCents >= milestone.amountCents;
    const ledgerType = isPartial ? "PARTIAL_RELEASE" : "RELEASE";
    const newStatus = fullyReleased ? "RELEASED" : "SUBMITTED";

    let advanceDeduction = 0;
    const advanceUpdates: ReturnType<typeof prisma.capitalAdvance.update>[] = [];
    if (p.vendorId) {
      const outstandingAdvances = await prisma.capitalAdvance.findMany({
        where: { projectId: milestone.projectId, vendorId: p.vendorId, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
      });

      let remainingDeduction = releasedAmount;
      for (const adv of outstandingAdvances) {
        if (remainingDeduction <= 0) break;
        const owed = adv.approvedCents - adv.repaidCents;
        if (owed <= 0) continue;
        const deduct = Math.min(owed, remainingDeduction);
        advanceDeduction += deduct;
        remainingDeduction -= deduct;
        const newRepaid = adv.repaidCents + deduct;
        advanceUpdates.push(
          prisma.capitalAdvance.update({
            where: { id: adv.id },
            data: {
              repaidCents: newRepaid,
              ...(newRepaid >= adv.approvedCents ? { repaidAt: new Date() } : {}),
            },
          })
        );
      }
    }
    const netToVendor = releasedAmount - advanceDeduction;

    let vendorWalletId: string | null = null;
    if (p.vendorId) {
      const vendorWallet = await prisma.wallet.upsert({
        where: { userId: p.vendorId },
        create: { userId: p.vendorId },
        update: {},
      });
      vendorWalletId = vendorWallet.id;
    }

    const clientWallet = await prisma.wallet.findUnique({ where: { userId: p.clientId } });

    const releaseNote = advanceDeduction > 0
      ? `${isPartial ? "Partial payment" : "Payment"} received. ₹${(advanceDeduction / 100).toFixed(2)} deducted for advance repayment.`
      : (isPartial ? "Partial payment received." : "Payment received.");

    await prisma.$transaction([
      prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          status: newStatus,
          releasedCents: newReleasedCents,
          ...(fullyReleased ? { releasedAt: new Date() } : {}),
        },
      }),
      prisma.escrowLedgerEntry.create({
        data: {
          milestoneId: milestone.id,
          type: ledgerType,
          amountCents: releasedAmount,
          note: parsed.data.note ?? (isPartial ? "Partial funds released." : "Funds released."),
        },
      }),
      ...(vendorWalletId
        ? [
            prisma.wallet.update({
              where: { id: vendorWalletId },
              data: { availableCents: { increment: netToVendor } },
            }),
            prisma.walletTransaction.create({
              data: {
                walletId: vendorWalletId,
                type: "RELEASE",
                amountCents: netToVendor,
                status: "POSTED",
                projectId: milestone.projectId,
                milestoneId: milestone.id,
                note: releaseNote,
              },
            }),
          ]
        : []),
      ...(clientWallet
        ? [
            prisma.wallet.update({
              where: { id: clientWallet.id },
              data: { heldCents: { decrement: releasedAmount } },
            }),
          ]
        : []),
      ...advanceUpdates,
    ]);

    await createInvoice({
      type: isPartial ? "PARTIAL_RELEASE" : "RELEASE",
      userId: p.vendorId ?? p.clientId,
      amountCents: releasedAmount,
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      description: isPartial
        ? `Partial release for milestone: ${milestone.title}`
        : `Full release for milestone: ${milestone.title}`,
    });

    const inferredStage = inferFabricStage(milestone.title);
    if (inferredStage) {
      await advanceFabricItems(milestone.projectId, inferredStage, me.id);
    }

    await notifyProjectParties(milestone.projectId, me.id, {
      type: "MILESTONE_RELEASED",
      title: fullyReleased ? "Payment Released" : "Partial Payment Released",
      body: fullyReleased
        ? `"${milestone.title}" — full payment of ${(milestone.amountCents / 100).toFixed(2)} INR released.`
        : `"${milestone.title}" — ${(releasedAmount / 100).toFixed(2)} INR released (${(newReleasedCents / 100).toFixed(2)}/${(milestone.amountCents / 100).toFixed(2)} total).`,
      linkUrl: `/app/projects/${milestone.projectId}`,
    });
    await fireWebhookEvent(p.clientId, fullyReleased ? "milestone.released" : "milestone.partial_release", {
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      title: milestone.title,
      releasedAmountCents: releasedAmount,
      totalReleasedCents: newReleasedCents,
      fullyReleased,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "dispute") {
    if (role === "ADMIN") return NextResponse.json({ error: "Admin cannot raise disputes" }, { status: 403 });
    if (milestone.status === "RELEASED") return NextResponse.json({ error: "Cannot dispute released milestone" }, { status: 400 });
    const disputeAttachments = (parsed.data.files ?? []).map(f => prisma.fileAttachment.create({
      data: { uploaderId: me.id, fileName: f.fileName, mimeType: f.mimeType ?? null, sizeBytes: f.sizeBytes ?? null, url: f.url ?? null, milestoneId: milestone.id },
    }));
    await prisma.$transaction([
      prisma.milestone.update({ where: { id: milestone.id }, data: { status: "DISPUTED" } }),
      prisma.dispute.create({ data: { projectId: milestone.projectId, milestoneId: milestone.id, reason: parsed.data.note ?? "Dispute opened (demo).", status: "OPEN" } }),
      prisma.escrowLedgerEntry.create({ data: { milestoneId: milestone.id, type: "DISPUTE_OPENED", amountCents: 0, note: parsed.data.note ?? "Dispute opened (demo)." } }),
      ...disputeAttachments,
    ]);

    await notifyProjectParties(milestone.projectId, me.id, {
      type: "DISPUTE_OPENED",
      title: "Dispute Opened",
      body: `A dispute has been opened for "${milestone.title}".`,
      linkUrl: `/app/disputes`,
    });
    await fireWebhookEvent(p.clientId, "dispute.opened", {
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      title: milestone.title,
      reason: parsed.data.note,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
