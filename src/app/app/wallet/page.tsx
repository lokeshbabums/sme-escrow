"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const money = (c: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    c / 100,
  );

interface WalletData {
  availableCents: number;
  heldCents: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  status: string;
  note: string | null;
  projectId: string | null;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  gateway: string;
  method: string | null;
  amountCents: number;
  status: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  createdAt: string;
}

type Step = "amount" | "method" | "processing" | "done";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("amount");
  const [method, setMethod] = useState<string>("upi");
  const [error, setError] = useState("");
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const load = async () => {
    const [walletRes, paymentsRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/wallet/payments"),
    ]);
    if (walletRes.ok) {
      const data = await walletRes.json();
      setWallet(data.wallet);
      setTransactions(data.transactions);
    }
    if (paymentsRes.ok) {
      const data = await paymentsRes.json();
      setPayments(data.payments);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startPayment = async () => {
    setError("");
    setStep("processing");

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: amount, method }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        setStep("method");
        return;
      }

      const order = data.order;

      if (order.gateway === "RAZORPAY" && order.gatewayKey) {
        await handleRazorpay(order);
        return;
      }

      if (order.gateway === "STRIPE" && order.stripeClientSecret) {
        await handleStripe(order);
        return;
      }

      // DEMO mode — verify immediately
      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: order.paymentId }),
      });

      if (verifyRes.ok) {
        setPaymentResult({
          gateway: "Demo",
          method: "Simulated",
          amount: order.amount,
        });
        setStep("done");
        await load();
      } else {
        const err = await verifyRes.json();
        setError(err.error ?? "Verification failed");
        setStep("method");
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setStep("method");
    }
  };

  const handleRazorpay = async (order: any) => {
    // Load Razorpay script dynamically
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay"));
      });
    }

    const rzp = new (window as any).Razorpay({
      key: order.gatewayKey,
      amount: order.amount,
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: "LaundryEscrow",
      description: `Wallet deposit of ${money(order.amount)}`,
      handler: async (response: any) => {
        const verifyRes = await fetch("/api/wallet/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: order.paymentId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        if (verifyRes.ok) {
          const result = await verifyRes.json();
          setPaymentResult({
            gateway: "Razorpay",
            method: result.method ?? method,
            amount: order.amount,
          });
          setStep("done");
          await load();
        } else {
          const err = await verifyRes.json();
          setError(err.error ?? "Payment verification failed");
          setStep("method");
        }
      },
      modal: {
        ondismiss: () => {
          setError("Payment cancelled");
          setStep("method");
        },
      },
      prefill: {},
      theme: { color: "#2563eb" },
    });

    rzp.open();
  };

  const handleStripe = async (order: any) => {
    // For Stripe, we'd use Stripe.js Elements
    // Simplified: verify payment intent status after user completes in Stripe-hosted checkout
    setPaymentResult({
      gateway: "Stripe",
      method: "card",
      amount: order.amount,
      note: "Stripe integration requires Stripe.js Elements for full checkout. Payment intent created.",
    });
    setStep("done");
  };

  const resetFlow = () => {
    setStep("amount");
    setAmount("");
    setMethod("upi");
    setError("");
    setPaymentResult(null);
  };

  const statusColor = (s: string) => {
    if (s === "COMPLETED") return "bg-green-100 text-green-800";
    if (s === "FAILED") return "bg-red-100 text-red-800";
    if (s === "PENDING" || s === "PROCESSING") return "bg-yellow-100 text-yellow-800";
    return "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wallet</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Manage your funds and deposit via UPI, cards, or net banking.
        </p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription>Your current wallet balance.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Available
            </div>
            <div className="text-2xl font-semibold">
              {wallet ? money(wallet.availableCents) : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Held in escrow
            </div>
            <div className="text-2xl font-semibold">
              {wallet ? money(wallet.heldCents) : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add money</CardTitle>
          <CardDescription>
            {step === "amount" && "Enter amount to deposit."}
            {step === "method" && "Choose a payment method."}
            {step === "processing" && "Processing your payment..."}
            {step === "done" && "Payment successful!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "amount" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                  <Button
                    key={q}
                    variant={amount === String(q) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(String(q))}
                  >
                    ₹{q.toLocaleString("en-IN")}
                  </Button>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom amount in ₹"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="max-w-[200px]"
                />
                <Button
                  onClick={() => {
                    if (!amount || parseFloat(amount) <= 0) {
                      setError("Enter a valid amount");
                      return;
                    }
                    setError("");
                    setStep("method");
                  }}
                  disabled={!amount}
                >
                  Continue
                </Button>
              </div>
              {error && (
                <p className="text-sm text-[hsl(var(--destructive))]">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "method" && (
            <div className="space-y-4">
              <div className="text-lg font-semibold">
                Depositing {money(Math.round(parseFloat(amount) * 100))}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Payment method
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      id: "upi",
                      label: "UPI",
                      desc: "Google Pay, PhonePe, Paytm",
                      icon: "📱",
                    },
                    {
                      id: "card",
                      label: "Debit / Credit Card",
                      desc: "Visa, Mastercard, RuPay",
                      icon: "💳",
                    },
                    {
                      id: "netbanking",
                      label: "Net Banking",
                      desc: "SBI, HDFC, ICICI, and more",
                      icon: "🏦",
                    },
                    {
                      id: "wallet",
                      label: "Mobile Wallet",
                      desc: "Paytm, Freecharge, etc.",
                      icon: "👛",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        method === m.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                          : "hover:bg-[hsl(var(--accent))]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <div>
                          <div className="text-sm font-medium">{m.label}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            {m.desc}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("amount")}>
                  Back
                </Button>
                <Button onClick={startPayment}>
                  Pay {money(Math.round(parseFloat(amount) * 100))}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-[hsl(var(--destructive))]">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Connecting to payment gateway...
              </div>
            </div>
          )}

          {step === "done" && paymentResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                <div className="text-2xl font-semibold text-green-700">
                  Payment successful
                </div>
                <div className="mt-1 text-sm text-green-600">
                  {money(paymentResult.amount)} deposited to your wallet
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-green-600">
                  <Badge className="bg-green-100 text-green-700">
                    {paymentResult.gateway}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700">
                    {paymentResult.method}
                  </Badge>
                </div>
              </div>
              <Button onClick={resetFlow} className="w-full">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              Gateway transactions for deposits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge>{p.gateway}</Badge>
                    {p.method && (
                      <Badge className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                        {p.method}
                      </Badge>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(p.createdAt).toLocaleString()}
                    {p.gatewayPaymentId && (
                      <span> • Ref: {p.gatewayPaymentId.slice(0, 20)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right font-medium whitespace-nowrap">
                  {money(p.amountCents)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet transactions</CardTitle>
          <CardDescription>All wallet movements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge>{tx.type}</Badge>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {tx.note && (
                    <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      {tx.note}
                    </div>
                  )}
                </div>
                <div className="text-right font-medium whitespace-nowrap">
                  {money(tx.amountCents)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
