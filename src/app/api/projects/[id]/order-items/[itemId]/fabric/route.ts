import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const STAGES = ["RECEIVED", "SORTING", "WASHING", "DRYING", "PRESSING", "QC_CHECK", "PACKED", "DELIVERED"] as const;

const UpdateSchema = z.object({
  stage: z.enum(STAGES),
  note: z.string().max(500).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { fabricUpdates: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, email: true } } } } },
  });
  if (!item || item.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item, stages: STAGES });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "VENDOR" && role !== "ADMIN") return NextResponse.json({ error: "Only vendors can update fabric status" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { project: true } });
  if (!item || item.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role === "VENDOR" && item.project.vendorId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { stage, note } = parsed.data;

  if (role !== "ADMIN") {
    const currentIdx = STAGES.indexOf(item.currentStage as any);
    const newIdx = STAGES.indexOf(stage);
    if (newIdx <= currentIdx) {
      return NextResponse.json({ error: "Can only move forward in the lifecycle" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.fabricUpdate.create({
      data: { orderItemId: itemId, stage, note: note ?? null, actorId: me.id },
    }),
    prisma.orderItem.update({
      where: { id: itemId },
      data: { currentStage: stage, currentStageAt: new Date() },
    }),
  ]);

  await logActivity({
    type: "FABRIC_UPDATE",
    actorId: me.id,
    projectId: id,
    orderItemId: itemId,
    summary: `${item.itemName} → ${stage.replace(/_/g, " ")}${note ? `: ${note}` : ""}`,
    metadata: { stage, itemName: item.itemName, category: item.category },
  });

  if (stage === "DELIVERED") {
    const allItems = await prisma.orderItem.findMany({ where: { projectId: id } });
    const allDelivered = allItems.every(
      (i) => i.id === itemId ? true : i.currentStage === "DELIVERED"
    );
    if (allDelivered) {
      await prisma.project.update({ where: { id }, data: { status: "COMPLETED" } });
      await logActivity({
        type: "MILESTONE_RELEASED",
        actorId: me.id,
        projectId: id,
        summary: "All items delivered — order auto-completed",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
