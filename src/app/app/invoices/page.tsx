import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) redirect("/login");

  const invoices = await prisma.invoice.findMany({
    where: role === "ADMIN" ? {} : { userId: me.id },
    orderBy: { issuedAt: "desc" },
    include: { project: { select: { title: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/app/invoices/${inv.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{inv.number}</div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        {inv.project?.title ?? "—"}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {new Date(inv.issuedAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{money(inv.totalCents)}</div>
                      <div className="mt-1 flex gap-1 justify-end">
                        <Badge variant="outline">{inv.type}</Badge>
                        <Badge>{inv.status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
