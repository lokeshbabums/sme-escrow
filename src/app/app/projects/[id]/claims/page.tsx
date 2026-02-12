"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

const CLAIM_TYPES = ["DAMAGE", "LOSS", "DELAY", "QUALITY"];
const claimLabel: Record<string, string> = { DAMAGE: "Damage", LOSS: "Loss", DELAY: "Delay", QUALITY: "Quality Issue" };
const claimColor: Record<string, string> = { DAMAGE: "bg-red-100 text-red-800", LOSS: "bg-orange-100 text-orange-800", DELAY: "bg-yellow-100 text-yellow-800", QUALITY: "bg-purple-100 text-purple-800" };

export default function ClaimsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [claims, setClaims] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [claimType, setClaimType] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const res = await fetch(`/api/projects/${projectId}/claims`);
    if (res.ok) { const data = await res.json(); setClaims(data.claims); }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!claimType || reason.length < 10) { setError("Select a type and provide a detailed description (min 10 chars)"); return; }
    const res = await fetch(`/api/projects/${projectId}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimType, reason }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
    setSuccess("Claim filed successfully. Admin will review.");
    setShowForm(false); setClaimType(""); setReason("");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Protection Claims</h1>
          <p className="text-[hsl(var(--muted-foreground))]">File and track damage, loss, delay, or quality claims.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "File Claim"}</Button>
          <Link href={`/app/projects/${projectId}`}><Button variant="outline">Back</Button></Link>
        </div>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</div>}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Claim</CardTitle><CardDescription>Select the type and describe the issue in detail.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {CLAIM_TYPES.map(t => (
                <button key={t} onClick={() => setClaimType(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${claimType === t ? "bg-[hsl(var(--primary))] text-white" : "border hover:bg-[hsl(var(--accent))]"}`}>
                  {claimLabel[t]}
                </button>
              ))}
            </div>
            <Textarea placeholder="Describe the issue in detail..." value={reason} onChange={e => setReason(e.target.value)} rows={4} />
            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
            <Button onClick={handleSubmit}>Submit Claim</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Claims History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {claims.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No claims filed.</p>
          ) : claims.map((c: any) => (
            <div key={c.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={claimColor[c.claimType] ?? ""}>{claimLabel[c.claimType] ?? c.claimType}</Badge>
                <Badge variant="outline">{c.status}</Badge>
                {c.milestone && <span className="text-xs text-[hsl(var(--muted-foreground))]">Milestone: {c.milestone.title}</span>}
              </div>
              <p className="text-sm mt-2">{c.reason}</p>
              {c.resolution && <p className="text-sm mt-2 text-green-700">Resolution: {c.resolution}</p>}
              {c.compensationCents > 0 && (
                <p className="text-sm mt-1 font-medium">Compensation: {money(c.compensationCents)} → {c.compensationRecipient}</p>
              )}
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                Filed by {c.openedBy?.name ?? c.openedBy?.email ?? "Unknown"} · {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
