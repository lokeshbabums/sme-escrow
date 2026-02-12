import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MilestoneTimeline } from "@/components/app/milestone-timeline";
import { FabricTracker } from "@/components/app/fabric-tracker";
import { UserCircle } from "lucide-react";

const money = (cents:number)=> new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(cents/100);

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  FUNDED: "bg-blue-50 text-blue-700 border-blue-300",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-300",
  SUBMITTED: "bg-purple-50 text-purple-700 border-purple-300",
  RELEASED: "bg-green-50 text-green-700 border-green-300",
  DISPUTED: "bg-red-50 text-red-700 border-red-300",
};

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return notFound();
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const email = session?.user?.email ?? "";
  const me = email ? await prisma.user.findUnique({ where: { email } }) : null;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { vendor: { select: { id: true, name: true, email: true } } },
  });
  if (!project) return notFound();

  const vendorAssigned = !!project.vendorId;

  const milestones = await prisma.milestone.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });

  const orderItems = await prisma.orderItem.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });

  const hasActiveWork = milestones.some((m) =>
    ["FUNDED", "IN_PROGRESS", "SUBMITTED", "RELEASED"].includes(m.status),
  );
  const isLocked = hasActiveWork;

  const ledgerEntries = await prisma.escrowLedgerEntry.findMany({
    where: { milestone: { projectId: project.id } },
    include: { milestone: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && project.clientId !== me?.id) return notFound();
    if (role === "VENDOR" && project.vendorId !== me?.id) return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{project.description}</p>
          <div className="mt-2 flex items-center gap-2"><Badge>{project.status}</Badge></div>
        </div>
        <Link href="/app/projects"><Button variant="outline">Back</Button></Link>
      </div>

      {orderItems.length > 0 && (
        <FabricTracker
          items={orderItems.map(i => ({
            id: i.id,
            itemName: i.itemName,
            category: i.category,
            quantity: i.quantity,
            notes: i.notes,
            currentStage: i.currentStage,
            currentStageAt: i.currentStageAt?.toISOString() ?? null,
          }))}
          projectId={project.id}
          isVendor={role === "VENDOR" || role === "ADMIN"}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Vendor details
          </CardTitle>
          <CardDescription>
            {vendorAssigned ? "Vendor assigned to this order." : "A vendor must be assigned before service stages can be created."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendorAssigned ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-sm">
                {(project.vendor?.name ?? project.vendor?.email ?? "V").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{project.vendor?.name ?? "Vendor"}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{project.vendor?.email}</div>
              </div>
              <Badge variant="outline" className="ml-auto">Assigned</Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-[hsl(var(--muted-foreground))]">No vendor assigned yet.</div>
              {role === "CLIENT" && (
                <Link href={`/app/projects/${project.id}/assign`}><Button>Assign vendor</Button></Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service milestones</CardTitle>
          <CardDescription>Fund → complete service stage → confirm → release payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {role === "CLIENT" && vendorAssigned && (
              <Link href={`/app/projects/${project.id}/milestones/new`}><Button>Add service stage</Button></Link>
            )}
            {role === "CLIENT" && !vendorAssigned && (
              <Button disabled className="opacity-50">Add service stage</Button>
            )}
            <Link href={`/app/projects/${project.id}/messages`}><Button variant="outline">Messages</Button></Link>
            <Link href={`/app/projects/${project.id}/claims`}><Button variant="outline">Claims</Button></Link>
            {role === "VENDOR" && vendorAssigned && (
              <Link href={`/app/projects/${project.id}/advances`}><Button variant="outline">Capital Advance</Button></Link>
            )}
          </div>
          {role === "CLIENT" && !vendorAssigned && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Assign a vendor above before adding service stages.</p>
          )}

          {milestones.length===0 ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">No milestones yet.</div>
          ) : (
            milestones.map(m=>(
              <div key={m.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                   <div>
                     <div className="font-medium">{m.title}</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">{m.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(m.amountCents)}</div>
                    <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor[m.status] ?? ""}`}>{m.status}</span>
                    {m.releasedCents > 0 && m.releasedCents < m.amountCents && (
                      <div className="mt-2 w-24">
                        <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))]">
                          <div className="h-1.5 rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.round((m.releasedCents / m.amountCents) * 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 text-right">
                          {Math.round((m.releasedCents / m.amountCents) * 100)}% released
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {(() => {
                  const showFund = role === "CLIENT" && m.status === "DRAFT";
                  const showSubmit = role === "VENDOR" && (m.status === "FUNDED" || m.status === "IN_PROGRESS");
                  const showApprove = role === "CLIENT" && m.status === "SUBMITTED";
                  const showDispute = (role === "CLIENT" || role === "VENDOR") && m.status !== "RELEASED" && m.status !== "DISPUTED";
                  const hasActions = showFund || showSubmit || showApprove || showDispute;
                  return hasActions ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {showFund && <Link href={`/app/projects/${project.id}/milestones/${m.id}?action=fund`}><Button size="sm">Fund</Button></Link>}
                      {showSubmit && <Link href={`/app/projects/${project.id}/milestones/${m.id}?action=submit`}><Button size="sm" variant="secondary">Update status</Button></Link>}
                      {showApprove && <Link href={`/app/projects/${project.id}/milestones/${m.id}?action=approve`}><Button size="sm" variant="outline">Confirm & Release</Button></Link>}
                      {showDispute && <Link href={`/app/projects/${project.id}/milestones/${m.id}?action=dispute`}><Button size="sm" variant="destructive">Dispute</Button></Link>}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">No actions available</div>
                  );
                })()}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <MilestoneTimeline entries={ledgerEntries} />
    </div>
  );
}
