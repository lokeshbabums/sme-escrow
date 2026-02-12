import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const DecisionSchema = z.object({
  resolution: z.string().min(5).max(2000),
  compensationRupees: z.string().optional(),
  compensationRecipient: z.enum(["CLIENT", "VENDOR"]).optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ did: string }> }) {
  const { did } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dispute = await prisma.dispute.findUnique({ where: { id: did }, include: { project: true } });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dispute.status !== "OPEN") return NextResponse.json({ error: "Already resolved" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const compensationCents = parsed.data.compensationRupees ? Math.round(parseFloat(parsed.data.compensationRupees) * 100) : 0;
  const recipient = parsed.data.compensationRecipient;

  const txOps: any[] = [
    prisma.dispute.update({
      where: { id: did },
      data: {
        status: "RESOLVED",
        resolution: parsed.data.resolution,
        compensationCents,
        compensationRecipient: recipient ?? null,
        compensationNote: parsed.data.note ?? null,
        decidedById: me.id,
        decidedAt: new Date(),
      },
    }),
  ];

  if (compensationCents > 0 && recipient) {
    const recipientUserId = recipient === "CLIENT" ? dispute.project.clientId : dispute.project.vendorId;
    if (recipientUserId) {
      const recipientWallet = await prisma.wallet.upsert({
        where: { userId: recipientUserId },
        create: { userId: recipientUserId },
        update: {},
      });

      const sourceUserId = recipient === "CLIENT" ? dispute.project.vendorId : dispute.project.clientId;
      if (sourceUserId) {
        const sourceWallet = await prisma.wallet.findUnique({ where: { userId: sourceUserId } });
        if (sourceWallet) {
          const fromHeld = Math.min(compensationCents, sourceWallet.heldCents);
          const fromAvailable = compensationCents - fromHeld;

          if (fromHeld > 0) {
            txOps.push(prisma.wallet.update({ where: { id: sourceWallet.id }, data: { heldCents: { decrement: fromHeld } } }));
          }
          if (fromAvailable > 0) {
            txOps.push(prisma.wallet.update({ where: { id: sourceWallet.id }, data: { availableCents: { decrement: fromAvailable } } }));
          }
        }
      }

      txOps.push(
        prisma.wallet.update({ where: { id: recipientWallet.id }, data: { availableCents: { increment: compensationCents } } }),
        prisma.walletTransaction.create({
          data: {
            walletId: recipientWallet.id,
            type: "RELEASE",
            amountCents: compensationCents,
            status: "POSTED",
            projectId: dispute.projectId,
            note: `Compensation awarded (Claim: ${dispute.claimType})`,
          },
        }),
      );
    }
  }

  await prisma.$transaction(txOps);

  await logActivity({
    type: "CLAIM_DECIDED",
    actorId: me.id,
    projectId: dispute.projectId,
    disputeId: did,
    summary: `${dispute.claimType} claim resolved${compensationCents > 0 ? ` — ₹${(compensationCents / 100).toFixed(2)} to ${recipient}` : ""}`,
    metadata: { compensationCents, recipient, resolution: parsed.data.resolution },
  });

  return NextResponse.json({ ok: true });
}
