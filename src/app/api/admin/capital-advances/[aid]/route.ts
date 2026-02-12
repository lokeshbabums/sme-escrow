import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const DecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  approvedRupees: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const advance = await prisma.capitalAdvance.findUnique({ where: { id: aid }, include: { project: true } });
  if (!advance) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (advance.status !== "REQUESTED") return NextResponse.json({ error: "Already processed" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.action === "reject") {
    await prisma.capitalAdvance.update({
      where: { id: aid },
      data: { status: "REJECTED", decisionNote: parsed.data.note ?? "Rejected by admin" },
    });
    await logActivity({
      type: "ADVANCE_REJECTED",
      actorId: me.id,
      projectId: advance.projectId,
      capitalAdvanceId: aid,
      summary: `Advance request of ₹${(advance.requestedCents / 100).toFixed(2)} rejected`,
    });
    return NextResponse.json({ ok: true });
  }

  const approvedCents = parsed.data.approvedRupees
    ? Math.round(parseFloat(parsed.data.approvedRupees) * 100)
    : advance.requestedCents;

  if (approvedCents > advance.requestedCents) {
    return NextResponse.json({ error: "Cannot approve more than requested" }, { status: 400 });
  }

  const vendorWallet = await prisma.wallet.upsert({
    where: { userId: advance.vendorId },
    create: { userId: advance.vendorId },
    update: {},
  });

  const fundedMilestone = await prisma.milestone.findFirst({
    where: { projectId: advance.projectId },
    orderBy: { createdAt: "asc" },
  });

  await prisma.$transaction([
    prisma.capitalAdvance.update({
      where: { id: aid },
      data: { status: "APPROVED", approvedCents, decisionNote: parsed.data.note ?? "Approved" },
    }),
    prisma.wallet.update({
      where: { id: vendorWallet.id },
      data: { availableCents: { increment: approvedCents } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: vendorWallet.id,
        type: "DEPOSIT",
        amountCents: approvedCents,
        status: "POSTED",
        projectId: advance.projectId,
        note: `Working capital advance (Ref: ${aid.slice(0, 8)})`,
      },
    }),
    ...(fundedMilestone
      ? [
          prisma.escrowLedgerEntry.create({
            data: {
              milestoneId: fundedMilestone.id,
              type: "ADVANCE_APPROVED_PAYOUT",
              amountCents: approvedCents,
              note: `Working capital advance approved for vendor`,
            },
          }),
        ]
      : []),
  ]);

  await logActivity({
    type: "ADVANCE_APPROVED",
    actorId: me.id,
    projectId: advance.projectId,
    capitalAdvanceId: aid,
    summary: `Advance of ₹${(approvedCents / 100).toFixed(2)} approved and credited`,
    metadata: { approvedCents, requestedCents: advance.requestedCents },
  });

  return NextResponse.json({ ok: true });
}
