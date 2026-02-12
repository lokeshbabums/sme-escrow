"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TYPE_COLORS: Record<string, string> = {
  FABRIC_UPDATE: "bg-cyan-100 text-cyan-800",
  ADVANCE_REQUESTED: "bg-amber-100 text-amber-800",
  ADVANCE_APPROVED: "bg-amber-100 text-amber-800",
  ADVANCE_REJECTED: "bg-amber-100 text-amber-800",
  CLAIM_OPENED: "bg-red-100 text-red-800",
  CLAIM_DECIDED: "bg-red-100 text-red-800",
  MILESTONE_FUNDED: "bg-blue-100 text-blue-800",
  MILESTONE_SUBMITTED: "bg-blue-100 text-blue-800",
  MILESTONE_RELEASED: "bg-blue-100 text-blue-800",
  DISPUTE_OPENED: "bg-orange-100 text-orange-800",
  PAYMENT_COMPLETED: "bg-green-100 text-green-800",
};

const TABS = [
  { key: "", label: "All" },
  { key: "FABRIC_UPDATE", label: "Fabric" },
  { key: "CLAIM_OPENED", label: "Claims" },
  { key: "ADVANCE_REQUESTED", label: "Advances" },
  { key: "MILESTONE_FUNDED", label: "Milestones" },
  { key: "PAYMENT_COMPLETED", label: "Payments" },
];

export function AdminActivityFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (typeFilter: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", "20");
    const res = await fetch(`/api/admin/activity?${params}`);
    if (res.ok) { const data = await res.json(); setEvents(data.events); }
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Live platform timeline.</CardDescription>
          </div>
          <Link href="/app/admin/activity"><Button variant="outline" size="sm">View All</Button></Link>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === t.key ? "bg-[hsl(var(--primary))] text-white" : "border hover:bg-[hsl(var(--accent))]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No events found.</p>
        ) : events.map((e: any) => (
          <div key={e.id} className="rounded-xl border p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={TYPE_COLORS[e.type] ?? ""} >{e.type.replace(/_/g, " ")}</Badge>
              {e.project && <span className="text-xs text-[hsl(var(--muted-foreground))]">{e.project.title}</span>}
            </div>
            <p className="text-sm mt-1 line-clamp-2">{e.summary}</p>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {e.actor?.name ?? e.actor?.email ?? "System"} · {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
