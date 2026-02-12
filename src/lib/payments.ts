import { prisma } from "@/lib/prisma";

// ── Types ──

export type PaymentGateway = "RAZORPAY" | "STRIPE" | "DEMO";
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";

export interface CreateOrderResult {
  paymentId: string;       // our Payment record ID
  gateway: PaymentGateway;
  gatewayOrderId: string;  // gateway's order/session ID
  gatewayKey?: string;     // public key for client-side SDK
  amount: number;          // in smallest unit (paise)
  currency: string;
  // Razorpay specific
  razorpayOrderId?: string;
  // Stripe specific
  stripeClientSecret?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  paymentId: string;
  gatewayPaymentId?: string;
  method?: string;
  error?: string;
}

// ── Helpers ──

function getActiveGateway(): PaymentGateway {
  const mode = process.env.PAYMENT_MODE?.toUpperCase();
  if (mode === "RAZORPAY" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "RAZORPAY";
  if (mode === "STRIPE" && process.env.STRIPE_SECRET_KEY) return "STRIPE";
  return "DEMO";
}

function getRazorpayInstance() {
  const Razorpay = require("razorpay");
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

// ── Create Order ──

export async function createPaymentOrder(
  userId: string,
  walletId: string,
  amountCents: number,
  method?: PaymentMethod,
): Promise<CreateOrderResult> {
  const gateway = getActiveGateway();
  const currency = "INR";
  const amountPaise = amountCents; // INR cents = paise

  // Create our Payment record first
  const payment = await prisma.payment.create({
    data: {
      userId,
      walletId,
      gateway,
      method: method ?? null,
      amountCents,
      currency,
      status: "PENDING",
    },
  });

  if (gateway === "RAZORPAY") {
    const rz = getRazorpayInstance();
    const order = await rz.orders.create({
      amount: amountPaise,
      currency,
      receipt: payment.id,
      notes: { paymentId: payment.id, userId },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayOrderId: order.id },
    });

    return {
      paymentId: payment.id,
      gateway: "RAZORPAY",
      gatewayOrderId: order.id,
      gatewayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: amountPaise,
      currency,
      razorpayOrderId: order.id,
    };
  }

  if (gateway === "STRIPE") {
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountPaise),
        currency: currency.toLowerCase(),
        "metadata[paymentId]": payment.id,
        "metadata[userId]": userId,
      }).toString(),
    });
    const intent = await res.json();

    if (intent.error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: intent.error.message },
      });
      throw new Error(intent.error.message);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayOrderId: intent.id },
    });

    return {
      paymentId: payment.id,
      gateway: "STRIPE",
      gatewayOrderId: intent.id,
      gatewayKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      amount: amountPaise,
      currency,
      stripeClientSecret: intent.client_secret,
    };
  }

  // DEMO mode — auto-complete
  const demoOrderId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayOrderId: demoOrderId, status: "PENDING" },
  });

  return {
    paymentId: payment.id,
    gateway: "DEMO",
    gatewayOrderId: demoOrderId,
    amount: amountPaise,
    currency,
  };
}

// ── Verify / Confirm Payment ──

export async function verifyPayment(
  paymentId: string,
  gatewayData: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    stripe_payment_intent_id?: string;
  },
): Promise<VerifyPaymentResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, paymentId, error: "Payment not found" };
  if (payment.status === "COMPLETED") return { success: true, paymentId, gatewayPaymentId: payment.gatewayPaymentId ?? undefined };

  if (payment.gateway === "RAZORPAY") {
    if (!gatewayData.razorpay_payment_id || !gatewayData.razorpay_signature) {
      return { success: false, paymentId, error: "Missing Razorpay verification data" };
    }

    const crypto = require("crypto");
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${gatewayData.razorpay_order_id}|${gatewayData.razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== gatewayData.razorpay_signature) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED", failureReason: "Signature verification failed" },
      });
      return { success: false, paymentId, error: "Signature verification failed" };
    }

    // Fetch payment details from Razorpay to get method
    let method: string | undefined;
    try {
      const rz = getRazorpayInstance();
      const rzPayment = await rz.payments.fetch(gatewayData.razorpay_payment_id);
      method = rzPayment.method;
    } catch {}

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        gatewayPaymentId: gatewayData.razorpay_payment_id,
        method: method ?? "upi",
        completedAt: new Date(),
        metadataJson: JSON.stringify(gatewayData),
      },
    });

    return { success: true, paymentId, gatewayPaymentId: gatewayData.razorpay_payment_id, method };
  }

  if (payment.gateway === "STRIPE") {
    // Verify with Stripe API
    const intentId = gatewayData.stripe_payment_intent_id ?? payment.gatewayOrderId;
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${intentId}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    const intent = await res.json();

    if (intent.status !== "succeeded") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED", failureReason: `Stripe status: ${intent.status}` },
      });
      return { success: false, paymentId, error: `Payment not completed: ${intent.status}` };
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        gatewayPaymentId: intent.id,
        method: intent.payment_method_types?.[0] ?? "card",
        completedAt: new Date(),
        metadataJson: JSON.stringify({ intentId: intent.id, status: intent.status }),
      },
    });

    return { success: true, paymentId, gatewayPaymentId: intent.id, method: intent.payment_method_types?.[0] };
  }

  // DEMO mode — always succeeds
  const demoPayId = `demo_pay_${Date.now()}`;
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "COMPLETED",
      gatewayPaymentId: demoPayId,
      method: "demo",
      completedAt: new Date(),
    },
  });

  return { success: true, paymentId, gatewayPaymentId: demoPayId, method: "demo" };
}

// ── Credit wallet after successful payment ──

export async function creditWalletAfterPayment(paymentId: string): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "COMPLETED") return false;

  // Check if already credited (idempotency)
  const existing = await prisma.walletTransaction.findFirst({
    where: { walletId: payment.walletId, note: { contains: paymentId } },
  });
  if (existing) return true;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: payment.walletId },
      data: { availableCents: { increment: payment.amountCents } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: payment.walletId,
        type: "DEPOSIT",
        amountCents: payment.amountCents,
        status: "POSTED",
        note: `Payment via ${payment.gateway} (${payment.method ?? "unknown"}) • Ref: ${paymentId}`,
      },
    }),
  ]);

  return true;
}

export function getAvailableGateways(): { id: PaymentGateway; name: string; available: boolean }[] {
  return [
    {
      id: "RAZORPAY",
      name: "Razorpay (UPI, Cards, Net Banking)",
      available: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
    {
      id: "STRIPE",
      name: "Stripe (Cards, UPI)",
      available: !!(process.env.STRIPE_SECRET_KEY),
    },
    {
      id: "DEMO",
      name: "Demo Mode (Simulated)",
      available: true,
    },
  ];
}
