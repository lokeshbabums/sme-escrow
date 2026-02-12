"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const money = (c: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export interface OrderCardData {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  vendorName: string | null;
  itemCount: number;
  totalCents: number;
}

export function OrderFilter({ orders, showDateFilters = false }: { orders: OrderCardData[]; showDateFilters?: boolean }) {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const lower = query.toLowerCase();
  const filtered = orders.filter(o => {
    const matchesText =
      o.title.toLowerCase().includes(lower) ||
      o.clientName.toLowerCase().includes(lower) ||
      (o.vendorName?.toLowerCase().includes(lower) ?? false) ||
      o.status.toLowerCase().includes(lower);
    if (!matchesText) return false;

    if (startDate) {
      const s = new Date(startDate);
      if (new Date(o.createdAt) < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (o.status !== "COMPLETED") return false;
      if (new Date(o.updatedAt) > e) return false;
    }
    return true;
  });

  const hasFilters = query || startDate || endDate;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Filter by client, vendor, title..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="max-w-[220px]"
        />
        {showDateFilters && (
          <>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Started after</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm bg-white h-9" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Completed by</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm bg-white h-9" />
            </div>
          </>
        )}
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStartDate(""); setEndDate(""); }}>
            Clear
          </Button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))]">No matching orders.</div>
      ) : (
        filtered.map(o => (
          <div key={o.id} className="rounded-2xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{o.title}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-1">{o.description}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                <span>Client: {o.clientName}</span>
                {o.vendorName && <span>Vendor: {o.vendorName}</span>}
                {o.itemCount > 0 && <span>{o.itemCount} items</span>}
                <span>{money(o.totalCents)} total</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                <span>Started: {fmtDate(o.createdAt)}</span>
                {o.status === "COMPLETED" && <span>Completed: {fmtDate(o.updatedAt)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{o.status}</Badge>
              <Link href={`/app/projects/${o.id}`}><Button variant="outline">Open</Button></Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
