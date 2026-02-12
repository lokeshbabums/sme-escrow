import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ItemSchema = z.object({
  category: z.string().min(1),
  itemName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(10000),
  notes: z.string().max(500).optional(),
});

const BulkSchema = z.object({
  items: z.array(ItemSchema).min(1).max(100),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && project.clientId !== me.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && project.vendorId !== me.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.orderItem.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "CLIENT" && role !== "ADMIN")
    return NextResponse.json(
      { error: "Only clients can add items" },
      { status: 403 },
    );

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!me)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: { milestones: true },
  });
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && project.clientId !== me.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasActiveWork = project.milestones.some((m) =>
    ["FUNDED", "IN_PROGRESS", "SUBMITTED", "RELEASED"].includes(m.status),
  );
  if (hasActiveWork) {
    return NextResponse.json(
      {
        error:
          "Cannot modify order items after pre-wash and collection has been initiated",
      },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.orderItem.deleteMany({ where: { projectId: id } });

  await prisma.orderItem.createMany({
    data: parsed.data.items.map((item) => ({
      projectId: id,
      category: item.category,
      itemName: item.itemName,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
  });

  return NextResponse.json({ ok: true });
}
