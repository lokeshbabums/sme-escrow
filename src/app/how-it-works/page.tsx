import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingBag,
  Lock,
  CheckCircle,
  Banknote,
  User,
  Shirt,
  Shield,
  Package,
  Truck,
  Droplets,
  Search,
  CreditCard,
  AlertTriangle,
  Eye,
  FileText,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

const escrowSteps = [
  {
    icon: ShoppingBag,
    title: "Place Order",
    description: "Customer submits a laundry service request.",
  },
  {
    icon: Lock,
    title: "Payment Held in Escrow",
    description: "Funds are locked safely until service is complete.",
  },
  {
    icon: CheckCircle,
    title: "Service Completed",
    description: "Provider finishes washing, pressing & delivery.",
  },
  {
    icon: Banknote,
    title: "Payment Released",
    description: "Customer confirms and payment goes to provider.",
  },
];

const customerSteps = [
  { icon: ShoppingBag, text: "Create a laundry order with service details" },
  { icon: CreditCard, text: "Fund the order — money held safely in escrow" },
  { icon: CheckCircle, text: "Confirm delivery and release payment" },
  { icon: AlertTriangle, text: "Open a dispute if there are quality issues" },
];

const providerSteps = [
  { icon: Package, text: "View assigned orders and accept" },
  { icon: Truck, text: "Pick up clothes from customer" },
  { icon: Droplets, text: "Wash, dry, and press per care labels" },
  { icon: Search, text: "Quality check, fold, and package" },
  { icon: Truck, text: "Deliver to customer" },
  { icon: Banknote, text: "Payment released on customer confirmation" },
];

const adminSteps = [
  { icon: Eye, text: "Monitor all orders and escrow balances" },
  { icon: AlertTriangle, text: "Review disputes from customers/providers" },
  { icon: FileText, text: "Write resolution decisions" },
  { icon: CheckCircle, text: "Mark disputes as resolved or rejected" },
];

function RoleCard({
  icon: Icon,
  title,
  description,
  steps,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  steps: { icon: React.ElementType; text: string }[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-[hsl(var(--secondary))] px-6 py-5 flex items-center gap-3">
        <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <CardContent className="pt-6 space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-xs font-semibold">
              {i + 1}
            </span>
            <step.icon className="h-5 w-5 shrink-0 mt-0.5 text-[hsl(var(--primary))]" />
            <span className="text-sm leading-relaxed">{step.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">How LaundryEscrow Works</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Simple, secure escrow for laundry services.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {/* Escrow Flow */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Simplified Escrow Flow</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {escrowSteps.map((step, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <Card className="w-full md:w-52 flex flex-col items-center text-center p-5 shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--secondary))] mb-3">
                  <step.icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {step.description}
                </p>
              </Card>
              {i < escrowSteps.length - 1 && (
                <>
                  <ArrowRight className="hidden md:block h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <ArrowDown className="block md:hidden h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <RoleCard
          icon={User}
          title="Customer Journey"
          description="Place + fund laundry orders"
          steps={customerSteps}
        />
        <RoleCard
          icon={Shirt}
          title="Laundry Provider Journey"
          description="Complete service milestones"
          steps={providerSteps}
        />
        <RoleCard
          icon={Shield}
          title="Admin Journey"
          description="Resolve disputes + audit"
          steps={adminSteps}
        />
      </section>

      {/* CTA */}
      <section className="rounded-2xl border bg-[hsl(var(--secondary))] p-8 text-center space-y-4">
        <h2 className="text-2xl font-semibold">Ready to get started?</h2>
        <p className="text-[hsl(var(--muted-foreground))]">
          Join LaundryEscrow today for safe, transparent laundry transactions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button variant="outline">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Create account</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
