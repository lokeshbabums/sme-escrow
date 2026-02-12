"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FEATURES } from "@/lib/features";

const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  profile: {
    kycStatus: string;
    docType: string | null;
    docNumber: string | null;
    docFileUrl: string | null;
    kycNotes: string | null;
    kycVerifiedAt: string | null;
    kycVerifiedBy: string | null;
  } | null;
  wallet: { availableCents: number; heldCents: number } | null;
  featureFlags: { key: string; enabled: boolean }[];
};

export default function AdminUserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [kycNotes, setKycNotes] = useState("");
  const [kycBusy, setKycBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/admin/users/${uid}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFeature = async (key: string, enabled: boolean) => {
    await fetch(`/api/admin/users/${uid}/features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    load();
  };

  const handleKyc = async (action: "APPROVED" | "REJECTED") => {
    setKycBusy(true);
    const res = await fetch(`/api/admin/users/${uid}/kyc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: kycNotes || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to update KYC");
    }
    setKycNotes("");
    setKycBusy(false);
    await load();
  };

  if (loading) return <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</div>;
  if (!user) return <div className="text-sm text-[hsl(var(--muted-foreground))]">User not found.</div>;

  const flagMap: Record<string, boolean> = {};
  for (const f of user.featureFlags) flagMap[f.key] = f.enabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>
        <p className="text-[hsl(var(--muted-foreground))]">{user.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Role</CardTitle></CardHeader>
          <CardContent><Badge>{user.role}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wallet Available</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{user.wallet ? money(user.wallet.availableCents) : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wallet Held</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{user.wallet ? money(user.wallet.heldCents) : "—"}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC Verification</CardTitle>
          <CardDescription>Status: {user.profile?.kycStatus ?? "NOT_STARTED"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.profile?.kycStatus === "APPROVED" && (
            <Badge className="bg-green-600 text-white border-green-600">Verified</Badge>
          )}
          {user.profile?.kycStatus === "REJECTED" && (
            <Badge className="bg-red-600 text-white border-red-600">Rejected</Badge>
          )}
          {(user.profile?.kycStatus === "NOT_STARTED" || !user.profile) && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">User has not submitted KYC documents yet.</div>
          )}

          {user.profile?.docType && (
            <div className="rounded-2xl border p-4 space-y-1 text-sm">
              <div><span className="font-medium">Document Type:</span> {user.profile.docType}</div>
              <div><span className="font-medium">Document Number:</span> {user.profile.docNumber ?? "—"}</div>
              {user.profile.docFileUrl && (
                <div><span className="font-medium">File:</span> <a href={user.profile.docFileUrl} target="_blank" rel="noreferrer" className="underline text-[hsl(var(--primary))]">{user.profile.docFileUrl}</a></div>
              )}
              {user.profile.kycNotes && (
                <div><span className="font-medium">Admin Notes:</span> {user.profile.kycNotes}</div>
              )}
              {user.profile.kycVerifiedAt && (
                <div><span className="font-medium">Verified at:</span> {new Date(user.profile.kycVerifiedAt).toLocaleString()}</div>
              )}
            </div>
          )}

          {user.profile?.kycStatus === "PENDING" && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Admin Notes</label>
                <Input value={kycNotes} onChange={(e) => setKycNotes(e.target.value)} placeholder="Optional notes…" />
              </div>
              <Button onClick={() => handleKyc("APPROVED")} disabled={kycBusy}>Approve</Button>
              <Button variant="outline" onClick={() => handleKyc("REJECTED")} disabled={kycBusy}>Reject</Button>
            </div>
          )}

          {(user.profile?.kycStatus === "APPROVED" || user.profile?.kycStatus === "REJECTED") && (
            <div className="flex items-end gap-3 pt-2 border-t">
              <div className="flex-1">
                <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Change Status</label>
                <Input value={kycNotes} onChange={(e) => setKycNotes(e.target.value)} placeholder="Optional notes…" />
              </div>
              <Button variant="outline" size="sm" onClick={() => handleKyc("APPROVED")} disabled={kycBusy}>Re-approve</Button>
              <Button variant="outline" size="sm" onClick={() => handleKyc("REJECTED")} disabled={kycBusy}>Reject</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Toggle features for this user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {FEATURES.map((key) => {
            const enabled = flagMap[key] ?? false;
            return (
              <label key={key} className="flex items-center gap-3 rounded-2xl border p-3 cursor-pointer hover:bg-[hsl(var(--accent))] transition">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleFeature(key, !enabled)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">{key}</span>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
