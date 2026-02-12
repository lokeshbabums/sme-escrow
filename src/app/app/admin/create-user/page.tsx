"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export default function AdminCreateUser() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<"CLIENT" | "VENDOR">("CLIENT");
  const [category, setCategory] = useState("HOTEL");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
    role: string;
  } | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, businessCategory: role === "CLIENT" ? category : undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed");
    } else {
      setCreated({ email, password, role });
    }
    setBusy(false);
  };

  if (created) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Create User</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-700">
              Account Created
            </h2>
            <div className="rounded-2xl border p-4 space-y-2 w-full max-w-sm text-center">
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Login credentials
              </div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Email:
                  </span>{" "}
                  <code className="rounded bg-[hsl(var(--secondary))] px-2 py-0.5 font-semibold">
                    {created.email}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Password:
                  </span>{" "}
                  <code className="rounded bg-[hsl(var(--secondary))] px-2 py-0.5 font-semibold">
                    {created.password}
                  </code>
                </div>
              </div>
              <Badge variant="outline" className="mt-2">
                Role: {created.role}
              </Badge>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center max-w-sm">
              User must change password on first login and complete KYC verification.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCreated(null);
                  setName("");
                  setEmail("");
                  setPassword("Password123!");
                  setRole("CLIENT");
                }}
              >
                Create Another
              </Button>
              <Link href="/app/admin/users">
                <Button>View All Users</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create User</h1>
      <Card>
        <CardHeader>
          <CardTitle>New User Account</CardTitle>
          <CardDescription>
            Admin creates a user account. KYC will need to be completed
            separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <div className="flex gap-2 mt-1">
              <Button className="flex-1" variant={role === "CLIENT" ? "default" : "outline"} onClick={() => setRole("CLIENT")}>Customer</Button>
              <Button className="flex-1" variant={role === "VENDOR" ? "default" : "outline"} onClick={() => setRole("VENDOR")}>Vendor</Button>
            </div>
          </div>
          {role === "CLIENT" && (
            <div>
              <label className="text-sm font-medium">Business Category</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { id: "HOTEL", label: "Hotel & Hospitality" },
                  { id: "HOSPITAL", label: "Hospital & Medical" },
                  { id: "HOSTEL", label: "Hostel & PG" },
                  { id: "SALON", label: "Salon & Spa" },
                  { id: "RESTAURANT", label: "Restaurant & Cafe" },
                  { id: "GENERAL", label: "General / Custom" },
                ].map((c) => (
                  <Button key={c.id} size="sm" variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)}>
                    {c.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Determines which textile categories the client sees when placing orders.
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Default: Password123! — share these credentials with the user.
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={
              busy || !name.trim() || !email.trim() || password.length < 8
            }
            className="w-full"
          >
            {busy ? "Creating…" : "Create User Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
