import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Create = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(5).max(4000),
  amountRupees: z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const milestones = await prisma.milestone.findMany({
    where: { projectId: id },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(milestones);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "CLIENT" && role !== "ADMIN") return NextResponse.json({ error: "Only client/admin" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  const project = await prisma.project.findUnique({ where: { id } });
  if (!me || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const amountCents = Math.round(parseFloat(parsed.data.amountRupees) * 100);
  await prisma.milestone.create({ data: { projectId: project.id, title: parsed.data.title, description: parsed.data.description, amountCents, status: "DRAFT" } });
  return NextResponse.json({ ok: true });
}
