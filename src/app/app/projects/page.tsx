import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderFilter } from "@/components/app/order-filter";

export default async function Projects() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const email = session?.user?.email ?? "";
  const me = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const profile = me ? await prisma.profile.findUnique({ where: { userId: me.id } }) : null;
  const kycApproved = profile?.kycStatus === "APPROVED";
  const where = role==="CLIENT" ? { clientId: me?.id } : role==="VENDOR" ? { vendorId: me?.id } : {};
  const projects = await prisma.project.findMany({ where, include: { milestones: true, client: { select: { name: true, email: true } }, vendor: { select: { name: true, email: true } }, _count: { select: { orderItems: true } } }, orderBy:{updatedAt:"desc"} });
  const fmtDate = (d:Date)=> d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  const money = (c:number)=> new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(c/100);

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
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Create laundry orders and track service milestones.</p>
        </div>
        {role === "CLIENT" && (
          kycApproved ? (
            <Link href="/app/projects/new"><Button>New order</Button></Link>
          ) : (
            <Link href="/app/onboarding"><Button variant="outline">Complete KYC to place orders</Button></Link>
          )
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>All orders</CardTitle><CardDescription>Filtered by your role.</CardDescription></CardHeader>
        <CardContent>
          <OrderFilter orders={orderCards} />
        </CardContent>
      </Card>
    </div>
  );
}
