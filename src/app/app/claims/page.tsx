"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const claimTypes = ["DAMAGE", "LOSS", "DELAY", "QUALITY"] as const;
const claimLabel: Record<string, string> = { DAMAGE: "Damage", LOSS: "Loss", DELAY: "Delay", QUALITY: "Quality" };
const claimColor: Record<string, string> = { DAMAGE: "bg-red-100 text-red-800", LOSS: "bg-orange-100 text-orange-800", DELAY: "bg-yellow-100 text-yellow-800", QUALITY: "bg-purple-100 text-purple-800" };

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

interface Project { id: string; title: string; }
interface Claim {
  id: string;
  claimType: string | null;
  status: string;
  reason: string;
  compensationCents: number;
  compensationNote: string | null;
  createdAt: string;
}

export default function VendorClaims() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [claimType, setClaimType] = useState("");
  const [reason, setReason] = useState("");
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
    if (!selectedProject) { setClaims([]); return; }
    fetch(`/api/projects/${selectedProject}/claims`).then(r => r.json()).then(d => setClaims(d.claims ?? [])).catch(() => setClaims([]));
  }, [selectedProject, success]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!selectedProject) { setError("Select an order."); return; }
    if (!claimType) { setError("Select a claim type."); return; }
    if (!reason.trim()) { setError("Describe the issue."); return; }
    setLoading(true);
    const res = await fetch(`/api/projects/${selectedProject}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimType, reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to file claim."); return; }
    setSuccess("Claim submitted successfully.");
    setClaimType("");
    setReason("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Claims</h1>
        <p className="text-[hsl(var(--muted-foreground))]">File claims for damage, loss, delay, or quality issues.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File a Claim</CardTitle>
          <CardDescription>Select an order and describe the issue.</CardDescription>
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
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
            value={claimType}
            onChange={e => setClaimType(e.target.value)}
          >
            <option value="">Select claim type</option>
            {claimTypes.map(t => <option key={t} value={t}>{claimLabel[t]}</option>)}
          </select>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px] bg-white"
            placeholder="Describe the issue..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit Claim"}</Button>
        </CardContent>
      </Card>

      {claims.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Your Claims</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {claims.map(c => (
              <div key={c.id} className="rounded-2xl border p-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={claimColor[c.claimType ?? ""] ?? ""}>{claimLabel[c.claimType ?? ""] ?? c.claimType}</Badge>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
                <p className="text-sm line-clamp-2">{c.reason}</p>
                {c.compensationCents > 0 && (
                  <div className="text-xs text-green-700">Compensation: {money(c.compensationCents)}</div>
                )}
                {c.compensationNote && <div className="text-xs text-[hsl(var(--muted-foreground))]">Note: {c.compensationNote}</div>}
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
