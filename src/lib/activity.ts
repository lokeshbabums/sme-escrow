import { prisma } from "@/lib/prisma";

export async function logActivity(opts: {
  type: string;
  actorId?: string;
  projectId?: string;
  milestoneId?: string;
  orderItemId?: string;
  disputeId?: string;
  capitalAdvanceId?: string;
  summary: string;
  metadata?: Record<string, any>;
}) {
  return prisma.activityEvent.create({
    data: {
      type: opts.type,
      actorId: opts.actorId,
      projectId: opts.projectId,
      milestoneId: opts.milestoneId,
      orderItemId: opts.orderItemId,
      disputeId: opts.disputeId,
      capitalAdvanceId: opts.capitalAdvanceId,
      summary: opts.summary,
      metadataJson: opts.metadata ? JSON.stringify(opts.metadata) : null,
    },
  });
}
