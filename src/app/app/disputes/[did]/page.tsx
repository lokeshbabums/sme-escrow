"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function DisputeDetail() {
  const params = useParams<{ did: string }>();
  const router = useRouter();
  const [d,setD]=useState<any>(null);
  const [resolution,setResolution]=useState("");

  async function load(){
    const res = await fetch(`/api/disputes/${params.did}`);
    const data = await res.json();
    setD(data.dispute);
    setResolution(data.dispute?.resolution ?? "");
  }
  useEffect(()=>{load();},[]);

  if(!d) return <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dispute</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{d.projectTitle} • {d.milestoneTitle ?? "Project-level"}</p>
          <div className="mt-2"><Badge>{d.status}</Badge></div>
        </div>
        <Button variant="outline" onClick={()=>router.push("/app/disputes")}>Back</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Reason</CardTitle><CardDescription>Submitted by customer or provider.</CardDescription></CardHeader>
        <CardContent className="text-sm text-[hsl(var(--muted-foreground))]">{d.reason}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resolution</CardTitle><CardDescription>{d.canResolve ? "Admin resolution panel." : "Resolution status."}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {d.canResolve ? (
            <>
              <Textarea value={resolution} onChange={(e)=>setResolution(e.target.value)} placeholder="Write resolution…" />
              <div className="flex gap-2">
                <Button onClick={async ()=>{
                  const res = await fetch(`/api/disputes/${params.did}/resolve`,{method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({resolution, status:"RESOLVED"})});
                  if(!res.ok) return alert((await res.json()).error ?? "Failed");
                  await load();
                }}>Resolve</Button>
                <Button variant="outline" onClick={async ()=>{
                  const res = await fetch(`/api/disputes/${params.did}/resolve`,{method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({resolution, status:"REJECTED"})});
                  if(!res.ok) return alert((await res.json()).error ?? "Failed");
                  await load();
                }}>Reject</Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {d.resolution ? d.resolution : "Awaiting admin resolution."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
