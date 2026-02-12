import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentOrder, type PaymentMethod } from "@/lib/payments";
import { z } from "zod";

const Body = z.object({
  amountRupees: z.string(),
  method: z.enum(["upi", "card", "netbanking", "wallet"]).optional(),
  gateway: z.enum(["RAZORPAY", "STRIPE", "DEMO"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const amount = parseFloat(parsed.data.amountRupees);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const amountCents = Math.round(amount * 100);

  const wallet = await prisma.wallet.upsert({
    where: { userId: me.id },
    create: { userId: me.id },
    update: {},
  });

  try {
    const order = await createPaymentOrder(me.id, wallet.id, amountCents, parsed.data.method as PaymentMethod | undefined);
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Payment creation failed" }, { status: 500 });
  }
}
