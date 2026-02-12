import { prisma } from "@/lib/prisma";

export async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const num = count + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(num).padStart(6, "0")}`;
}

export async function createInvoice(data: {
  type: string;
  userId: string;
  amountCents: number;
  feeCents?: number;
  projectId?: string;
  milestoneId?: string;
  description: string;
}) {
  const number = await generateInvoiceNumber();
  const fee = data.feeCents ?? 0;
  const total = data.amountCents + fee;

  return prisma.invoice.create({
    data: {
      number,
      type: data.type,
      userId: data.userId,
      subtotalCents: data.amountCents,
      feeCents: fee,
      totalCents: total,
      projectId: data.projectId,
      milestoneId: data.milestoneId,
      dataJson: JSON.stringify({
        description: data.description,
        lineItems: [
          { label: data.description, amountCents: data.amountCents },
          ...(fee > 0 ? [{ label: "Platform fee", amountCents: fee }] : []),
        ],
        total: total,
        currency: "INR",
        issuedAt: new Date().toISOString(),
      }),
    },
  });
}
