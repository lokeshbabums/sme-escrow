"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);
const statusColor: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-700",
};

interface Project { id: string; title: string; }
interface Advance {
  id: string;
  projectId: string;
  requestedCents: number;
  approvedCents: number;
  repaidCents: number;
  status: string;
  decisionNote: string | null;
  createdAt: string;
  vendor: { name: string | null; email: string };
}

export default function VendorAdvances() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => {
      const list = (d.projects ?? d ?? []).filter((p: any) => p.status !== "DRAFT");
      setProjects(list);
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) { setAdvances([]); return; }
    fetch(`/api/projects/${selectedProject}/capital-advances`).then(r => r.json()).then(d => setAdvances(d.advances ?? []));
  }, [selectedProject, success]);

  const handleRequest = async () => {
    setError("");
    setSuccess("");
    if (!selectedProject) { setError("Select an order first."); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    setLoading(true);
    const res = await fetch(`/api/projects/${selectedProject}/capital-advances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedRupees: amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Request failed."); return; }
    setSuccess("Advance request submitted.");
    setAmount("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Working Capital Advances</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Request advances against funded escrow on your orders.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request an Advance</CardTitle>
          <CardDescription>Up to 50% of funded escrow, minus outstanding advances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">Select an order</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <Input type="number" min="1" step="0.01" placeholder="Amount in ₹" value={amount} onChange={e => setAmount(e.target.value)} />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}
          <Button onClick={handleRequest} disabled={loading}>{loading ? "Submitting..." : "Request Advance"}</Button>
        </CardContent>
      </Card>

      {advances.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Your Requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {advances.map(a => (
              <div key={a.id} className="rounded-2xl border p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                    <span className="text-sm font-medium">Requested: {money(a.requestedCents)}</span>
                  </div>
                  {a.status === "APPROVED" && (
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Approved: {money(a.approvedCents)} · Repaid: {money(a.repaidCents)}
                    </div>
                  )}
                  {a.decisionNote && <div className="text-xs mt-1 text-[hsl(var(--muted-foreground))]">Note: {a.decisionNote}</div>}
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
