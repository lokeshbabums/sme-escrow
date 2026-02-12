import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({ resolution: z.string().min(3).max(4000), status: z.enum(["RESOLVED","REJECTED"]) });

export async function POST(req: Request, { params }: { params: Promise<{ did: string }> }) {
  const { did } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const dispute = await prisma.dispute.findUnique({ where: { id: did } });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.dispute.update({ where: { id: dispute.id }, data: { status: parsed.data.status, resolution: parsed.data.resolution } });
  return NextResponse.json({ ok: true });
}
