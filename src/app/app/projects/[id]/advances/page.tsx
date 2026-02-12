"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

interface Advance {
  id: string;
  requestedCents: number;
  approvedCents: number;
  repaidCents: number;
  status: string;
  decisionNote: string | null;
  createdAt: string;
  vendor: { name: string | null; email: string };
}

export default function AdvancesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/projects/${projectId}/capital-advances`);
    if (res.ok) {
      const data = await res.json();
      setAdvances(data.advances);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleRequest = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/capital-advances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedRupees: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
      } else {
        setSuccess("Advance request submitted. Admin will review shortly.");
        setAmount("");
        await load();
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const statusColor: Record<string, string> = {
    REQUESTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Working Capital Advances</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Request an advance against funded escrow for this order.</p>
        </div>
        <Link href={`/app/projects/${projectId}`}><Button variant="outline">Back</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Advance</CardTitle>
          <CardDescription>You can request up to 50% of funded (unreleased) escrow minus any outstanding advances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-center">
            <Input type="number" min="1" step="1" placeholder="Amount in ₹" value={amount} onChange={e => setAmount(e.target.value)} className="max-w-[200px]" />
            <Button onClick={handleRequest} disabled={!amount || loading}>{loading ? "Submitting..." : "Request"}</Button>
          </div>
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advance History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {advances.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No advances yet.</p>
          ) : advances.map(a => (
            <div key={a.id} className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Requested: {money(a.requestedCents)}</span>
                  <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                </div>
                {a.status === "APPROVED" && (
                  <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Approved: {money(a.approvedCents)} · Repaid: {money(a.repaidCents)}
                    {a.repaidCents >= a.approvedCents && <Badge className="ml-2 bg-green-100 text-green-700">Fully Repaid</Badge>}
                  </div>
                )}
                {a.decisionNote && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{a.decisionNote}</div>}
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              {a.status === "APPROVED" && a.repaidCents < a.approvedCents && (
                <div className="w-24">
                  <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))]">
                    <div className="h-1.5 rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.round((a.repaidCents / a.approvedCents) * 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 text-right">{Math.round((a.repaidCents / a.approvedCents) * 100)}% repaid</div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
