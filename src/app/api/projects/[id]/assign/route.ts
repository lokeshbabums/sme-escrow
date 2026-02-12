import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Only clients can assign vendors" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  const project = await prisma.project.findUnique({ where: { id } });
  if (!me || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const vendor = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!vendor || vendor.role !== "VENDOR") return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  await prisma.project.update({ where: { id: project.id }, data: { vendorId: vendor.id, status: "ACTIVE" } });
  return NextResponse.json({ ok: true });
}
