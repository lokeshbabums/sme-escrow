import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const CLAIM_TYPES = ["DAMAGE", "LOSS", "DELAY", "QUALITY"] as const;

const CreateSchema = z.object({
  claimType: z.enum(CLAIM_TYPES),
  reason: z.string().min(10).max(2000),
  milestoneId: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claims = await prisma.dispute.findMany({
    where: { projectId: id, claimType: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { milestone: { select: { title: true } }, openedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ claims });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "ADMIN") return NextResponse.json({ error: "Admin cannot file claims" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.clientId !== me.id && project.vendorId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.dispute.create({
    data: {
      projectId: id,
      milestoneId: parsed.data.milestoneId ?? null,
      status: "OPEN",
      reason: parsed.data.reason,
      claimType: parsed.data.claimType,
      openedById: me.id,
    },
  });

  await logActivity({
    type: "CLAIM_OPENED",
    actorId: me.id,
    projectId: id,
    disputeId: claim.id,
    summary: `${parsed.data.claimType} claim filed: ${parsed.data.reason.slice(0, 80)}`,
    metadata: { claimType: parsed.data.claimType },
  });

  return NextResponse.json({ ok: true, id: claim.id });
}
