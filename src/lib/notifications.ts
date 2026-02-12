import { prisma } from "@/lib/prisma";

export async function createNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  return prisma.notification.create({ data: opts });
}

export async function notifyProjectParties(
  projectId: string,
  excludeUserId: string,
  opts: { type: string; title: string; body: string; linkUrl?: string },
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;
  const userIds = [project.clientId, project.vendorId].filter(
    (uid): uid is string => !!uid && uid !== excludeUserId,
  );
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...opts })),
  });
}
