import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Create = z.object({ title: z.string().min(3).max(120), description: z.string().min(3).max(4000) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = role === "CLIENT" ? { clientId: me.id } : role === "VENDOR" ? { vendorId: me.id } : {};
  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Only clients can create orders" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const profile = await prisma.profile.findUnique({ where: { userId: me.id } });
  if (!profile || profile.kycStatus !== "APPROVED") {
    return NextResponse.json({ error: "KYC verification must be completed before placing orders" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const project = await prisma.project.create({ data: { title: parsed.data.title, description: parsed.data.description, clientId: me.id, status: "DRAFT" } });
  return NextResponse.json({ id: project.id });
}
