"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (newPass.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPass !== confirm) { setError("Passwords do not match"); return; }
    if (newPass === current) { setError("New password must be different from current password"); return; }

    setBusy(true);
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to change password");
      setBusy(false);
      return;
    }
    // Sign out and redirect to login — user logs in with new password, JWT refreshed
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change Password</h1>
        <p className="text-[hsl(var(--muted-foreground))]">You must change your temporary password before continuing.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)]">
              <Lock className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Choose a strong password you will remember.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Enter temporary password" />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
          </div>
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <Button onClick={handleSubmit} disabled={busy || !current || !newPass || !confirm} className="w-full">
            {busy ? "Changing…" : "Change Password & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
