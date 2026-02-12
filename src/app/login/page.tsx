"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [email, setEmail] = useState("client@demo.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
    } else if (res?.ok) {
      window.location.href = "/app";
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Use demo accounts to explore the laundry escrow platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
          <Input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" />
          <Button className="w-full" disabled={loading} onClick={handleLogin}>
            {loading ? "Signing in..." : "Continue"}
          </Button>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            New here? <Link className="underline" href="/signup">Create an account</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
