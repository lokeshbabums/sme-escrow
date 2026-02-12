import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallet = await prisma.wallet.upsert({
    where: { userId: me.id },
    create: { userId: me.id },
    update: {},
  });

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      amountCents: true,
      status: true,
      note: true,
      projectId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    wallet: {
      availableCents: wallet.availableCents,
      heldCents: wallet.heldCents,
      currency: wallet.currency,
    },
    transactions,
  });
}
