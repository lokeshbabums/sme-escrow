import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const claimLabel: Record<string, string> = { DAMAGE: "Damage", LOSS: "Loss", DELAY: "Delay", QUALITY: "Quality" };
const claimColor: Record<string, string> = { DAMAGE: "bg-red-100 text-red-800", LOSS: "bg-orange-100 text-orange-800", DELAY: "bg-yellow-100 text-yellow-800", QUALITY: "bg-purple-100 text-purple-800" };

export default async function AdminClaims() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/app");

  const claims = await prisma.dispute.findMany({
    where: { claimType: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true } },
      openedBy: { select: { name: true, email: true } },
      milestone: { select: { title: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Service Claims</h1><p className="text-[hsl(var(--muted-foreground))]">Review and resolve damage, loss, delay, and quality claims.</p></div>
      <Card>
        <CardHeader><CardTitle>All Claims</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {claims.length === 0 ? <p className="text-sm text-[hsl(var(--muted-foreground))]">No claims.</p> :
            claims.map(c => (
              <div key={c.id} className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={claimColor[c.claimType ?? ""] ?? ""}>{claimLabel[c.claimType ?? ""] ?? c.claimType}</Badge>
                    <Badge variant="outline">{c.status}</Badge>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">{c.project.title}</span>
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{c.reason}</p>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    By: {c.openedBy?.name ?? c.openedBy?.email ?? "Unknown"} · {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
                {c.status === "OPEN" && <Link href={`/app/admin/claims/${c.id}`}><Button size="sm">Resolve</Button></Link>}
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
