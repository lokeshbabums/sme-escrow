import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const CreateSchema = z.object({
  requestedRupees: z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/),
  note: z.string().max(500).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const advances = await prisma.capitalAdvance.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { vendor: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ advances });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "VENDOR") return NextResponse.json({ error: "Only vendors can request advances" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const requestedCents = Math.round(parseFloat(parsed.data.requestedRupees) * 100);

  const milestones = await prisma.milestone.findMany({ where: { projectId: id } });
  const fundedUnreleased = milestones
    .filter(m => ["FUNDED", "IN_PROGRESS", "SUBMITTED"].includes(m.status))
    .reduce((sum, m) => sum + (m.amountCents - m.releasedCents), 0);
  const maxAdvance = Math.floor(fundedUnreleased * 0.5);

  const existingAdvances = await prisma.capitalAdvance.findMany({
    where: { projectId: id, vendorId: me.id, status: "APPROVED" },
  });
  const outstanding = existingAdvances.reduce((sum, a) => sum + (a.approvedCents - a.repaidCents), 0);
  const available = Math.max(0, maxAdvance - outstanding);

  if (requestedCents > available) {
    return NextResponse.json({
      error: `Maximum advance available is ₹${(available / 100).toFixed(2)}. (50% of funded escrow minus outstanding advances)`,
    }, { status: 400 });
  }

  const pending = await prisma.capitalAdvance.findFirst({
    where: { projectId: id, vendorId: me.id, status: "REQUESTED" },
  });
  if (pending) {
    return NextResponse.json({ error: "You already have a pending advance request for this order" }, { status: 400 });
  }

  const advance = await prisma.capitalAdvance.create({
    data: {
      projectId: id,
      vendorId: me.id,
      requestedCents,
      status: "REQUESTED",
    },
  });

  await logActivity({
    type: "ADVANCE_REQUESTED",
    actorId: me.id,
    projectId: id,
    capitalAdvanceId: advance.id,
    summary: `Vendor requested advance of ₹${(requestedCents / 100).toFixed(2)}`,
    metadata: { requestedCents, availableLimit: available },
  });

  return NextResponse.json({ ok: true, id: advance.id });
}
