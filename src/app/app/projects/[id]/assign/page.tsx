"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Assign() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [email,setEmail]=useState("vendor@demo.com");
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Assign vendor</h1><p className="text-[hsl(var(--muted-foreground))]">Assign a vendor by email.</p></div>
      <Card>
        <CardHeader><CardTitle>Vendor email</CardTitle><CardDescription>Must be a VENDOR account.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Button onClick={async ()=>{
            const res = await fetch(`/api/projects/${params.id}/assign`,{method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({email})});
            if(!res.ok) return alert((await res.json()).error ?? "Failed");
            router.push(`/app/projects/${params.id}`);
          }}>Assign</Button>
        </CardContent>
      </Card>
    </div>
  );
}
