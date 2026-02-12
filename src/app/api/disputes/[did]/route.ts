import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ did: string }> }) {
  const { did } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dispute = await prisma.dispute.findUnique({ where: { id: did }, include: { project: true, milestone: true } });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && dispute.project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && dispute.project.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    dispute: {
      id: dispute.id,
      status: dispute.status,
      reason: dispute.reason,
      resolution: dispute.resolution,
      projectTitle: dispute.project.title,
      milestoneTitle: dispute.milestone?.title ?? null,
      canResolve: role === "ADMIN",
    },
  });
}
