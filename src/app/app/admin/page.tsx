import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminActivityFeed } from "./admin-activity-feed";

const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

export default async function AdminDashboard() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (role !== "ADMIN") redirect("/app");

  const [
    totalUsers,
    activeProjects,
    openDisputes,
    wallets,
    totalPayments,
    pendingKyc,
    pendingAdvances,
    openClaims,
    recentLedger,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count({ where: { status: { not: "DRAFT" } } }),
    prisma.dispute.count({ where: { status: "OPEN", claimType: null } }),
    prisma.wallet.aggregate({ _sum: { heldCents: true, availableCents: true } }),
    prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true }, _count: true }),
    prisma.profile.count({ where: { kycStatus: "PENDING" } }),
    prisma.capitalAdvance.count({ where: { status: "REQUESTED" } }),
    prisma.dispute.count({ where: { status: "OPEN", claimType: { not: null } } }),
    prisma.escrowLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { milestone: { include: { project: { select: { title: true } } } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
  ]);

  const totalEscrowHeld = wallets._sum.heldCents ?? 0;
  const totalAvailable = wallets._sum.availableCents ?? 0;
  const totalRevenue = totalPayments._sum.amountCents ?? 0;
  const paymentCount = totalPayments._count ?? 0;

  const stats = [
    { label: "Total Users", value: String(totalUsers), desc: "Registered accounts", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", accent: "text-blue-900" },
    { label: "Active Orders", value: String(activeProjects), desc: "Non-draft orders", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", accent: "text-indigo-900" },
    { label: "Open Disputes", value: String(openDisputes), desc: "Awaiting resolution", alert: openDisputes > 0, bg: openDisputes > 0 ? "bg-red-50" : "bg-slate-50", border: openDisputes > 0 ? "border-red-300" : "border-slate-200", text: openDisputes > 0 ? "text-red-600" : "text-slate-600", accent: openDisputes > 0 ? "text-red-700" : "text-slate-800" },
    { label: "Escrow Held", value: money(totalEscrowHeld), desc: "Across all wallets", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "text-emerald-900" },
    { label: "Total Deposits", value: money(totalRevenue), desc: `${paymentCount} payments`, bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", accent: "text-teal-900" },
    { label: "Pending KYC", value: String(pendingKyc), desc: "Awaiting review", alert: pendingKyc > 0, bg: pendingKyc > 0 ? "bg-amber-50" : "bg-slate-50", border: pendingKyc > 0 ? "border-amber-300" : "border-slate-200", text: pendingKyc > 0 ? "text-amber-600" : "text-slate-600", accent: pendingKyc > 0 ? "text-amber-700" : "text-slate-800" },
    { label: "Pending Advances", value: String(pendingAdvances), desc: "Vendor requests", alert: pendingAdvances > 0, bg: pendingAdvances > 0 ? "bg-orange-50" : "bg-slate-50", border: pendingAdvances > 0 ? "border-orange-300" : "border-slate-200", text: pendingAdvances > 0 ? "text-orange-600" : "text-slate-600", accent: pendingAdvances > 0 ? "text-orange-700" : "text-slate-800" },
    { label: "Open Claims", value: String(openClaims), desc: "Service claims", alert: openClaims > 0, bg: openClaims > 0 ? "bg-rose-50" : "bg-purple-50", border: openClaims > 0 ? "border-rose-300" : "border-purple-200", text: openClaims > 0 ? "text-rose-600" : "text-purple-600", accent: openClaims > 0 ? "text-rose-700" : "text-purple-800" },
  ];

  const pendingActions = [
    { href: "/app/admin/users", label: "Pending KYC", count: pendingKyc, desc: "Review KYC submissions" },
    { href: "/app/disputes", label: "Open Disputes", count: openDisputes, desc: "Resolve disputes" },
    { href: "/app/admin/claims", label: "Open Claims", count: openClaims, desc: "Service protection claims" },
    { href: "/app/admin/advances", label: "Pending Advances", count: pendingAdvances, desc: "Vendor capital requests" },
  ];

  const links = [
    { href: "/app/admin/create-user", label: "Create Customer", desc: "Register a new client account" },
    { href: "/app/admin/users", label: "Users & Roles", desc: "Manage users, roles & feature flags" },
    { href: "/app/invoices", label: "All Invoices", desc: "View all platform invoices" },
  ];

  const ledgerTypeLabel: Record<string, string> = {
    DEPOSIT: "Funded",
    RELEASE: "Released",
    PARTIAL_RELEASE: "Partial Release",
    PROOF_SUBMITTED: "Proof Submitted",
    DISPUTE_OPENED: "Dispute Opened",
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
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Platform overview and management.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-5 flex flex-col gap-1`}>
            <span className={`text-xs font-medium tracking-wide uppercase ${s.text}`}>{s.desc}</span>
            <span className={`text-base font-semibold ${s.accent}`}>{s.label}</span>
            <span className={`text-3xl font-bold tracking-tight mt-1 ${s.accent}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Pending Actions + Quick Links */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
              <CardDescription>Items requiring attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingActions.map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center justify-between rounded-xl border p-3 hover:bg-[hsl(var(--accent))] transition">
                  <div>
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{a.desc}</div>
                  </div>
                  <Badge variant={a.count > 0 ? "destructive" : "outline"}>{a.count}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Jump to admin sections</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {links.map((l) => (
                <Link key={l.label} href={l.href} className="rounded-xl border p-3 flex items-center justify-between hover:bg-[hsl(var(--accent))] transition">
                  <div>
                    <div className="text-sm font-medium">{l.label}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{l.desc}</div>
                  </div>
                  <Button variant="outline" size="sm">Open</Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Activity Feed */}
        <AdminActivityFeed />

        {/* Column 3: Recent Payments + Escrow Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest gateway transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No payments yet.</p>
              ) : (
                recentPayments.map((p) => (
                   <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border p-3">
                     <div className="min-w-0 flex-1">
                       <div className="flex flex-wrap items-center gap-1.5">
                         <Badge>{p.gateway}</Badge>
                         <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(p.status)}`}>
                           {p.status}
                         </span>
                       </div>
                       <div className="mt-1.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
                         {p.user.email} • {new Date(p.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                       </div>
                     </div>
                     <div className="text-right text-base font-semibold whitespace-nowrap">{money(p.amountCents)}</div>
                   </div>
                 ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Escrow Activity</CardTitle>
              <CardDescription>Latest milestone events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLedger.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No activity yet.</p>
              ) : (
                recentLedger.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{ledgerTypeLabel[entry.type] ?? entry.type}</Badge>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(entry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">{entry.milestone.title}</span>
                        <span className="text-[hsl(var(--muted-foreground))]"> — {entry.milestone.project.title}</span>
                      </div>
                      {entry.note && (
                        <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">{entry.note}</div>
                      )}
                    </div>
                    {entry.amountCents > 0 && (
                      <div className="text-sm font-semibold whitespace-nowrap">{money(entry.amountCents)}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
