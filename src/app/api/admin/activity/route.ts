import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const cursor = url.searchParams.get("cursor");

  const where: any = {};
  if (type) where.type = type;
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const events = await prisma.activityEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { name: true, email: true } },
      project: { select: { title: true } },
    },
  });

  return NextResponse.json({ events });
}
