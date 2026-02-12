import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const milestone = await prisma.milestone.findUnique({
    where: { id: mid },
    include: { escrow: { orderBy: { createdAt: "desc" } }, project: true, attachments: { orderBy: { createdAt: "desc" } } },
  });
  if (!milestone || milestone.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && milestone.project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && milestone.project.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    milestone: {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      amountCents: milestone.amountCents,
      status: milestone.status,
      escrow: milestone.escrow.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      attachments: milestone.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    },
  });
}
