"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Signup() {
  const router = useRouter();
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState<"CLIENT"|"VENDOR">("CLIENT");

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Select your role in the laundry escrow platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" />
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
          <Input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password (min 8)" type="password" />
          <div className="flex gap-2">
            <Button className="flex-1" variant={role==="CLIENT"?"default":"outline"} onClick={()=>setRole("CLIENT")}>Customer</Button>
            <Button className="flex-1" variant={role==="VENDOR"?"default":"outline"} onClick={()=>setRole("VENDOR")}>Vendor</Button>
          </div>
          <Button className="w-full" onClick={async ()=>{
            const res = await fetch("/api/signup", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({name,email,password,role})});
            if (!res.ok) return alert((await res.json()).error ?? "Signup failed");
            router.push("/login");
          }}>Create</Button>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            Already have an account? <Link className="underline" href="/login">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
