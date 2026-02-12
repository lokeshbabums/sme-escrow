"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

export default function AdminAdvanceDetail() {
  const params = useParams();
  const router = useRouter();
  const aid = params.aid as string;
  const [approvedAmount, setApprovedAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleDecision = async (action: "approve" | "reject") => {
    setError("");
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/capital-advances/${aid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvedRupees: action === "approve" ? approvedAmount : undefined,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Action failed");
      } else {
        router.push("/app/admin/advances");
      }
    } catch {
      setError("Network error");
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Review Advance Request</h1>
      <Card>
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>Approve or reject this working capital advance request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Approved Amount (₹)</label>
            <Input type="number" min="1" placeholder="Amount to approve" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className="mt-1 max-w-[200px]" />
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Leave blank to approve full requested amount</p>
          </div>
          <div>
            <label className="text-sm font-medium">Note</label>
            <Textarea placeholder="Decision note..." value={note} onChange={e => setNote(e.target.value)} className="mt-1" rows={2} />
          </div>
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={() => handleDecision("approve")} disabled={processing}>Approve</Button>
            <Button variant="destructive" onClick={() => handleDecision("reject")} disabled={processing}>Reject</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
