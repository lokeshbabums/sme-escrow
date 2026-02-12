import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function Disputes() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const email = session?.user?.email ?? "";
  const me = email ? await prisma.user.findUnique({ where: { email } }) : null;

  const all = await prisma.dispute.findMany({ include: { project: true, milestone: true }, orderBy:{updatedAt:"desc"}, take: 50 });
  const visible = all.filter(d=>{
    if(role==="ADMIN") return true;
    if(!me) return false;
    if(role==="CLIENT") return d.project.clientId===me.id;
    if(role==="VENDOR") return d.project.vendorId===me.id;
    return false;
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Disputes</h1><p className="text-[hsl(var(--muted-foreground))]">Track and resolve laundry service disputes.</p></div>
      <Card>
        <CardHeader><CardTitle>Cases</CardTitle><CardDescription>Admins resolve disputes for quality, damage, or delivery issues.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {visible.length===0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No disputes.</div> :
            visible.map(d=>(
              <div key={d.id} className="rounded-2xl border p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{d.project.title}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">{d.reason}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Milestone: {d.milestone?.title ?? "Project-level"}</div>
                </div>
                <div className="text-right space-y-2">
                  <Badge>{d.status}</Badge>
                  <Link href={`/app/disputes/${d.id}`}><Button size="sm" variant="outline">Open</Button></Link>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
