import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

interface LineItem {
  label: string;
  amountCents: number;
}

interface InvoiceData {
  description?: string;
  lineItems?: LineItem[];
  total?: number;
  currency?: string;
  issuedAt?: string;
}

export default async function InvoiceDetail({ params }: { params: Promise<{ iid: string }> }) {
  const { iid } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) redirect("/login");

  const invoice = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { project: { select: { title: true } } },
  });
  if (!invoice) return notFound();

  if (role !== "ADMIN" && invoice.userId !== me.id) return notFound();

  let data: InvoiceData = {};
  try {
    data = JSON.parse(invoice.dataJson);
  } catch {
    // ignore
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invoice {invoice.number}</h1>
        <Link href="/app/invoices">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            {invoice.project?.title ?? "—"} • Issued{" "}
            {new Date(invoice.issuedAt).toLocaleDateString("en-IN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="outline">{invoice.type}</Badge>
            <Badge>{invoice.status}</Badge>
          </div>

          {data.lineItems && data.lineItems.length > 0 && (
            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[hsl(var(--muted))]">
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineItems.map((item, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="p-3">{item.label}</td>
                      <td className="p-3 text-right">{money(item.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{money(invoice.subtotalCents)}</span>
            </div>
            {invoice.feeCents > 0 && (
              <div className="flex justify-between text-sm">
                <span>Platform Fee</span>
                <span>{money(invoice.feeCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>{money(invoice.totalCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
