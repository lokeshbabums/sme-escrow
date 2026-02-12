import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

export default async function AdminAdvances() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/app");

  const advances = await prisma.capitalAdvance.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { name: true, email: true } },
      project: { select: { title: true } },
    },
  });

  const statusColor: Record<string, string> = {
    REQUESTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Capital Advance Requests</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Review and approve vendor working capital advances.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {advances.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No advance requests.</p>
          ) : advances.map(a => (
            <div key={a.id} className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{a.vendor.name ?? a.vendor.email}</span>
                  <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{a.project.title}</span>
                </div>
                <div className="text-sm mt-1">Requested: {money(a.requestedCents)}</div>
                {a.status === "APPROVED" && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Approved: {money(a.approvedCents)} · Repaid: {money(a.repaidCents)}</div>
                )}
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              {a.status === "REQUESTED" && (
                <Link href={`/app/admin/advances/${a.id}`}><Button size="sm">Review</Button></Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
