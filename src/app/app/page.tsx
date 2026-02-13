import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderFilter } from "@/components/app/order-filter";

const money = (cents:number)=> new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(cents/100);
const fmtDate = (d:Date)=> d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

export default async function AppHome() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const email = session?.user?.email ?? "";
  const me = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const profile = me ? await prisma.profile.findUnique({ where: { userId: me.id } }) : null;
  const kycApproved = profile?.kycStatus === "APPROVED";

  const where = role==="CLIENT" ? { clientId: me?.id } : role==="VENDOR" ? { vendorId: me?.id } : {};
  const projects = await prisma.project.findMany({ where, include: { milestones: true, client: { select: { name: true, email: true } }, vendor: { select: { name: true, email: true } }, _count: { select: { orderItems: true } } }, orderBy: { updatedAt:"desc" } });

  const total = projects.flatMap(p=>p.milestones).reduce((a,m)=>a+m.amountCents,0);
  const inEscrow = projects.flatMap(p=>p.milestones).filter(m=>m.status==="FUNDED").reduce((a,m)=>a+m.amountCents,0);

  const isAdmin = role === "ADMIN";

  const orderCards = projects.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    clientName: p.client.name ?? p.client.email,
    vendorName: p.vendor ? (p.vendor.name ?? p.vendor.email) : null,
    itemCount: p._count.orderItems,
    totalCents: p.milestones.reduce((a, m) => a + m.amountCents, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Your laundry orders and escrow at a glance.</p>
        </div>
        {role === "CLIENT" && (
          kycApproved ? (
            <Link href="/app/projects/new"><Button>New order</Button></Link>
          ) : (
            <Link href="/app/onboarding"><Button variant="outline">Complete KYC to place orders</Button></Link>
          )
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total order value</CardTitle><CardDescription>Across recent orders</CardDescription></CardHeader><CardContent className="text-2xl font-semibold">{money(total)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Held in escrow</CardTitle><CardDescription>Funded & held</CardDescription></CardHeader><CardContent className="text-2xl font-semibold">{money(inEscrow)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Role</CardTitle><CardDescription>Current access</CardDescription></CardHeader><CardContent className="text-2xl font-semibold">{role ?? "-"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent orders</CardTitle><CardDescription>Open to manage service milestones.</CardDescription></CardHeader>
        <CardContent>
          <OrderFilter orders={orderCards} showDateFilters />
        </CardContent>
      </Card>
    </div>
  );
}
