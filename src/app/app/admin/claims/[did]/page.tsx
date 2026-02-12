"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminClaimResolve() {
  const params = useParams();
  const router = useRouter();
  const did = params.did as string;
  const [resolution, setResolution] = useState("");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [recipient, setRecipient] = useState<"CLIENT" | "VENDOR" | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleResolve = async () => {
    setError("");
    if (resolution.length < 5) { setError("Resolution must be at least 5 characters"); return; }
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/claims/${did}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          compensationRupees: compensationAmount || undefined,
          compensationRecipient: recipient || undefined,
          note: note || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); }
      else { router.push("/app/admin/claims"); }
    } catch { setError("Network error"); }
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Resolve Claim</h1>
      <Card>
        <CardHeader><CardTitle>Resolution Decision</CardTitle><CardDescription>Provide resolution and optional compensation.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Resolution</label>
            <Textarea placeholder="Describe the resolution..." value={resolution} onChange={e => setResolution(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Compensation Amount (₹)</label>
              <Input type="number" min="0" placeholder="0 if no compensation" value={compensationAmount} onChange={e => setCompensationAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Pay To</label>
              <div className="flex gap-2 mt-1">
                {(["CLIENT", "VENDOR"] as const).map(r => (
                  <button key={r} onClick={() => setRecipient(r)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${recipient === r ? "bg-[hsl(var(--primary))] text-white" : "border hover:bg-[hsl(var(--accent))]"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Admin Note</label>
            <Textarea placeholder="Internal note..." value={note} onChange={e => setNote(e.target.value)} className="mt-1" rows={2} />
          </div>
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <Button onClick={handleResolve} disabled={processing}>{processing ? "Processing..." : "Resolve Claim"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
