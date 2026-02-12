"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Profile {
  kycStatus: string;
  docType?: string | null;
  docNumber?: string | null;
  kycNotes?: string | null;
}

interface SettingsData {
  user: { id: string; name: string | null; email: string; role: string };
  profile: Profile | null;
  wallet: { availableCents: number; heldCents: number; currency: string } | null;
  features: Record<string, boolean>;
  webhooks: { id: string; url: string; enabled: boolean; createdAt: string }[];
}

export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookAdding, setWebhookAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-[hsl(var(--muted-foreground))]">Loading…</div>;
  if (!data) return <div className="p-6 text-[hsl(var(--destructive))]">Failed to load settings.</div>;

  const { user, profile, wallet, features, webhooks } = data;
  const kycStatus = profile?.kycStatus ?? "NOT_STARTED";

  async function addWebhook() {
    setWebhookAdding(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    if (!res.ok) { alert((await res.json()).error ?? "Failed to add webhook"); }
    else { await load(); setWebhookUrl(""); }
    setWebhookAdding(false);
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch("/api/webhooks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Your profile and verification settings.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Account details.</CardDescription></CardHeader>
        <CardContent className="text-sm text-[hsl(var(--muted-foreground))] space-y-2">
          <div><span className="font-medium text-[hsl(var(--foreground))]">Name:</span> {user.name ?? "-"}</div>
          <div><span className="font-medium text-[hsl(var(--foreground))]">Email:</span> {user.email}</div>
          <div><span className="font-medium text-[hsl(var(--foreground))]">Role:</span> {user.role}</div>
        </CardContent>
      </Card>

      {/* KYC */}
      {user.role !== "ADMIN" && (
        <Card>
          <CardHeader><CardTitle>KYC Verification</CardTitle><CardDescription>Identity verification status.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {kycStatus === "APPROVED" && (
              <Badge className="bg-green-600 text-white border-green-600">Verified</Badge>
            )}
            {kycStatus === "PENDING" && (
              <div className="space-y-2">
                <Badge className="bg-yellow-500 text-white border-yellow-500">Pending Review</Badge>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Your documents are being reviewed.</p>
              </div>
            )}
            {kycStatus === "REJECTED" && (
              <div className="space-y-2">
                <Badge className="bg-red-600 text-white border-red-600">Rejected</Badge>
                {profile?.kycNotes && (
                  <p className="text-sm text-[hsl(var(--destructive))]">Admin notes: {profile.kycNotes}</p>
                )}
              </div>
            )}
            <Link href="/app/onboarding">
              <Button variant="outline" className="w-full">
                {kycStatus === "NOT_STARTED" ? "Start KYC Verification" : kycStatus === "REJECTED" ? "Resubmit KYC" : "View KYC Status"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Wallet */}
      {wallet && (
        <Card>
          <CardHeader><CardTitle>Wallet</CardTitle><CardDescription>Your balance overview.</CardDescription></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Available</span>
              <span className="font-medium">{(wallet.availableCents / 100).toFixed(2)} {wallet.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Held in escrow</span>
              <span className="font-medium">{(wallet.heldCents / 100).toFixed(2)} {wallet.currency}</span>
            </div>
            <Link href="/app/wallet" className="text-sm underline text-[hsl(var(--primary))]">Go to Wallet</Link>
          </CardContent>
        </Card>
      )}

      {/* Webhooks */}
      {features.WEBHOOKS_ENABLED && (
        <Card>
          <CardHeader><CardTitle>Webhooks</CardTitle><CardDescription>Manage webhook endpoints.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {webhooks.length > 0 && (
              <div className="space-y-2">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <span className="truncate flex-1 text-[hsl(var(--muted-foreground))]">{wh.url}</span>
                    <Button size="sm" variant={wh.enabled ? "default" : "outline"} onClick={() => toggleWebhook(wh.id, !wh.enabled)}>
                      {wh.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="flex-1" />
              <Button disabled={webhookAdding || !webhookUrl.trim()} onClick={addWebhook}>
                {webhookAdding ? "Adding…" : "Add Webhook"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Flags */}
      <Card>
        <CardHeader><CardTitle>Feature Flags</CardTitle><CardDescription>Features enabled for your account.</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {Object.entries(features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-[hsl(var(--foreground))]">{key.replace(/_/g, " ")}</span>
                {enabled ? (
                  <Badge className="bg-green-600 text-white border-green-600">Enabled</Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
