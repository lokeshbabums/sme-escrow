import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shirt,
  Droplets,
  Sparkles,
  ShoppingBag,
  Lock,
  CheckCircle,
  Banknote,
  User,
  Shield,
  Package,
  Search,
  Truck,
  ArrowRight,
  WashingMachine,
  CreditCard,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-[hsl(var(--secondary))]">
      {/* ── Header ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border bg-[hsl(var(--primary))] font-bold text-white">
            LE
          </div>
          <div>
            <div className="font-semibold">LaundryEscrow</div>
            <div className="hidden text-sm text-[hsl(var(--muted-foreground))] sm:block">
              Trusted escrow for laundry services
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button>Create account</Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div className="space-y-6">
          <Badge className="text-sm">
            Laundry Escrow Platform • Milestone-based payments
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Laundry escrow that keeps everyone{" "}
            <span className="underline decoration-[hsl(var(--primary))] underline-offset-8">
              clean
            </span>
            .
          </h1>
          <p className="max-w-lg text-lg text-[hsl(var(--muted-foreground))]">
            Fund laundry orders, track pickup → wash → delivery milestones,
            release payment on completion — with a full audit trail and dispute
            resolution.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app">
              <Button size="lg" className="gap-2">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline">
                Create account
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero illustration — icon grid */}
        <div className="flex items-center justify-center">
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: Shirt, label: "Shirt" },
              { icon: Droplets, label: "Wash" },
              { icon: Sparkles, label: "Clean" },
              { icon: WashingMachine, label: "Machine" },
              { icon: Package, label: "Sorted" },
              { icon: CreditCard, label: "Pay" },
              { icon: Lock, label: "Secure" },
              { icon: CheckCircle, label: "Done" },
              { icon: Truck, label: "Deliver" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[hsl(var(--primary)/0.08)] md:h-24 md:w-24">
                  <Icon className="h-9 w-9 text-[hsl(var(--primary))] md:h-11 md:w-11" />
                </div>
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Escrow Protects You ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge className="mb-3 border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]">
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              How Escrow Protects You
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[hsl(var(--muted-foreground))]">
              Payments are held safely until the job is done — protecting both
              customer and provider.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)]">
                <ShoppingBag className="h-7 w-7 text-[hsl(var(--primary))]" />
              </div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                Step 1
              </div>
              <h3 className="text-lg font-semibold">Place Order</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Customer places laundry order with service details
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden items-center lg:flex">
              <ArrowRight className="h-6 w-6 text-[hsl(var(--muted-foreground)/0.4)]" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Lock className="h-7 w-7 text-[hsl(var(--primary))]" />
              </div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                Step 2
              </div>
              <h3 className="text-lg font-semibold">Payment Held</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Money held safely in escrow until service is complete
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden items-center lg:flex">
              <ArrowRight className="h-6 w-6 text-[hsl(var(--muted-foreground)/0.4)]" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)]">
                <CheckCircle className="h-7 w-7 text-[hsl(var(--primary))]" />
              </div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                Step 3
              </div>
              <h3 className="text-lg font-semibold">Service Done</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Provider completes laundry through all milestones
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden items-center lg:flex">
              <ArrowRight className="h-6 w-6 text-[hsl(var(--muted-foreground)/0.4)]" />
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)]">
                <Banknote className="h-7 w-7 text-[hsl(var(--primary))]" />
              </div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                Step 4
              </div>
              <h3 className="text-lg font-semibold">Payment Released</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Funds released to provider after confirmation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Every Role ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge className="mb-3 border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]">
              Role-Based Access
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">For Every Role</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[hsl(var(--muted-foreground))]">
              Each participant gets a tailored dashboard with the tools they
              need.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Customer */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
                  <User className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <CardTitle>Customer</CardTitle>
                <CardDescription>
                  Place orders and track your laundry
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Place laundry orders with service preferences</span>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Fund escrow securely before work begins</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Confirm delivery to release payment</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Raise disputes for quality or damage issues</span>
                </div>
              </CardContent>
            </Card>

            {/* Laundry Provider */}
            <Card className="rounded-2xl border-[hsl(var(--primary))] shadow-lg">
              <CardHeader>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--primary))] text-white">
                  <Shirt className="h-6 w-6" />
                </div>
                <CardTitle>Vendor</CardTitle>
                <CardDescription>
                  Manage orders and earn through milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Accept incoming laundry orders</span>
                </div>
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>
                    Update milestones: Pickup → Wash → QC → Deliver
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Get paid automatically on customer confirmation</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Build reputation with quality service</span>
                </div>
              </CardContent>
            </Card>

            {/* Admin */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
                  <Shield className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <CardTitle>Admin</CardTitle>
                <CardDescription>
                  Oversee platform and resolve disputes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Monitor all orders and service status</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Resolve disputes between parties</span>
                </div>
                <div className="flex items-start gap-2">
                  <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Audit escrow ledger and transactions</span>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>Manage user accounts and roles</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Laundry Service Stages ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge className="mb-3 border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]">
              Service Milestones
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              Laundry Service Stages
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[hsl(var(--muted-foreground))]">
              Every order passes through four tracked milestones — each one
              verified before payment is released.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Package,
                title: "Pickup & Sorting",
                desc: "Clothes collected, sorted by fabric/color, stains noted",
                step: "1",
              },
              {
                icon: Droplets,
                title: "Wash & Press",
                desc: "Washed per care labels, dried, ironed and pressed",
                step: "2",
              },
              {
                icon: Search,
                title: "Quality Check",
                desc: "Items inspected, counted, folded and packaged",
                step: "3",
              },
              {
                icon: Truck,
                title: "Delivery",
                desc: "Delivered to customer, confirmation captured",
                step: "4",
              },
            ].map(({ icon: Icon, title, desc, step }) => (
              <Card key={step} className="group rounded-2xl transition hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--primary)/0.08)] transition group-hover:bg-[hsl(var(--primary)/0.15)]">
                      <Icon className="h-7 w-7 text-[hsl(var(--primary))]" />
                    </div>
                    <span className="text-2xl font-bold text-[hsl(var(--primary)/0.2)]">
                      {step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Credentials ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <Badge className="mb-3 border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]">
              Try It Out
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">Demo Credentials</h2>
            <p className="mx-auto mt-3 max-w-xl text-[hsl(var(--muted-foreground))]">
              Log in with any of the demo accounts below to explore each role.
              Password for all:{" "}
              <code className="rounded bg-[hsl(var(--secondary))] px-2 py-0.5 text-sm font-semibold">
                Password123!
              </code>
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: User,
                role: "Customer",
                email: "client@demo.com",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Shirt,
                role: "Vendor",
                email: "vendor@demo.com",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: Shield,
                role: "Admin",
                email: "admin@demo.com",
                color: "bg-amber-50 text-amber-600",
              },
            ].map(({ icon: Icon, role, email, color }) => (
              <Card key={role} className="rounded-2xl text-center">
                <CardContent className="flex flex-col items-center gap-3 pt-6">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-full ${color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="font-semibold">{role}</div>
                  <code className="rounded bg-[hsl(var(--secondary))] px-3 py-1 text-sm">
                    {email}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Try the demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--primary))] text-xs font-bold text-white">
              LE
            </div>
            <span className="font-semibold">LaundryEscrow</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Trusted escrow for laundry services — secure payments, tracked
            milestones, dispute resolution.
          </p>
        </div>
      </footer>
    </main>
  );
}
