import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyPayment, creditWalletAfterPayment } from "@/lib/payments";
import { z } from "zod";

const Body = z.object({
  paymentId: z.string(),
  razorpay_payment_id: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  stripe_payment_intent_id: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await verifyPayment(parsed.data.paymentId, {
    razorpay_payment_id: parsed.data.razorpay_payment_id,
    razorpay_order_id: parsed.data.razorpay_order_id,
    razorpay_signature: parsed.data.razorpay_signature,
    stripe_payment_intent_id: parsed.data.stripe_payment_intent_id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Verification failed" }, { status: 400 });
  }

  await creditWalletAfterPayment(parsed.data.paymentId);

  return NextResponse.json({ ok: true, method: result.method });
}
