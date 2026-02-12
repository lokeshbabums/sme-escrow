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
          {isAdmin ? (
            <OrderFilter orders={orderCards} showDateFilters />
          ) : (
            <div className="space-y-3">
              {projects.length===0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No orders yet.</div> :
                projects.map(p=>(
                  <div key={p.id} className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-1">{p.description}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        <span>Client: {p.client.name ?? p.client.email}</span>
                        {p.vendor && <span>Vendor: {p.vendor.name ?? p.vendor.email}</span>}
                        {p._count.orderItems > 0 && <span>{p._count.orderItems} items</span>}
                        <span>{money(p.milestones.reduce((a,m)=>a+m.amountCents,0))} total</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        <span>Started: {fmtDate(p.createdAt)}</span>
                        {p.status === "COMPLETED" && <span>Completed: {fmtDate(p.updatedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>{p.status}</Badge>
                      <Link href={`/app/projects/${p.id}`}><Button variant="outline">Open</Button></Link>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
