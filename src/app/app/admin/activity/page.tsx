"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "FABRIC_UPDATE", label: "Fabric" },
  { key: "ADVANCE_REQUESTED", label: "Advances" },
  { key: "CLAIM_OPENED", label: "Claims" },
  { key: "MILESTONE_FUNDED", label: "Milestones" },
  { key: "PAYMENT_COMPLETED", label: "Payments" },
  { key: "DISPUTE_OPENED", label: "Disputes" },
];

export default function AdminActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (typeFilter: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", "100");
    const res = await fetch(`/api/admin/activity?${params}`);
    if (res.ok) { const data = await res.json(); setEvents(data.events); }
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity Feed</h1>
        <p className="text-[hsl(var(--muted-foreground))]">All platform activity events.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === f.key ? "bg-[hsl(var(--primary))] text-white" : "border hover:bg-[hsl(var(--accent))]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Events</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No events found.</p>
          ) : events.map((e: any) => (
            <div key={e.id} className="flex items-start gap-3 rounded-xl border p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={TYPE_COLORS[e.type] ?? ""}>{e.type.replace(/_/g, " ")}</Badge>
                  {e.project && <span className="text-xs text-[hsl(var(--muted-foreground))]">{e.project.title}</span>}
                </div>
                <p className="text-sm mt-1">{e.summary}</p>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {e.actor?.name ?? e.actor?.email ?? "System"} · {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
