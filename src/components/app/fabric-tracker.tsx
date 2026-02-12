"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STAGES = ["RECEIVED", "SORTING", "WASHING", "DRYING", "PRESSING", "QC_CHECK", "PACKED", "DELIVERED"];

const stageLabel: Record<string, string> = {
  RECEIVED: "Received",
  SORTING: "Sorting",
  WASHING: "Washing",
  DRYING: "Drying",
  PRESSING: "Pressing",
  QC_CHECK: "QC Check",
  PACKED: "Packed",
  DELIVERED: "Delivered",
};

const stageColor: Record<string, string> = {
  RECEIVED: "bg-gray-100 text-gray-700",
  SORTING: "bg-blue-100 text-blue-700",
  WASHING: "bg-cyan-100 text-cyan-700",
  DRYING: "bg-amber-100 text-amber-700",
  PRESSING: "bg-purple-100 text-purple-700",
  QC_CHECK: "bg-orange-100 text-orange-700",
  PACKED: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-green-100 text-green-700",
};

interface OrderItemData {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  notes: string | null;
  currentStage: string;
  currentStageAt: string | null;
}

export function FabricTracker({ items, projectId, isVendor }: { items: OrderItemData[]; projectId: string; isVendor: boolean }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [error, setError] = useState("");
  const [localItems, setLocalItems] = useState(items);

  const getNextStages = (current: string) => {
    const idx = STAGES.indexOf(current);
    return STAGES.slice(idx + 1);
  };

  const handleUpdate = async (itemId: string) => {
    if (!selectedStage) return;
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/order-items/${itemId}/fabric`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: selectedStage, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Update failed");
        return;
      }
      setLocalItems(prev => prev.map(i => i.id === itemId ? { ...i, currentStage: selectedStage, currentStageAt: new Date().toISOString() } : i));
      setUpdating(null);
      setNote("");
      setSelectedStage("");
    } catch {
      setError("Network error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabric Lifecycle ({localItems.reduce((s, i) => s + i.quantity, 0)} pieces)</CardTitle>
        <CardDescription>Track each item through the laundry pipeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {localItems.map((item) => {
          const stageIdx = STAGES.indexOf(item.currentStage);
          const progress = ((stageIdx + 1) / STAGES.length) * 100;
          const nextStages = getNextStages(item.currentStage);

          return (
            <div key={item.id} className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium">{item.itemName}</span>
                  <span className="text-[hsl(var(--muted-foreground))]"> — {item.category.replace(/_/g, " ")}</span>
                  <Badge variant="outline" className="ml-2">×{item.quantity}</Badge>
                </div>
                <Badge className={stageColor[item.currentStage] ?? ""}>{stageLabel[item.currentStage] ?? item.currentStage}</Badge>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-1">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`h-1.5 w-full rounded-full ${i <= stageIdx ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`} />
                    <span className={`text-[9px] ${i <= stageIdx ? "text-[hsl(var(--primary))] font-medium" : "text-[hsl(var(--muted-foreground))]"}`}>
                      {stageLabel[s]?.slice(0, 4)}
                    </span>
                  </div>
                ))}
              </div>

              {isVendor && nextStages.length > 0 && (
                <div>
                  {updating === item.id ? (
                    <div className="space-y-2 rounded-xl border p-3 bg-[hsl(var(--secondary))]">
                      <div className="flex flex-wrap gap-2">
                        {nextStages.map(s => (
                          <button key={s} onClick={() => setSelectedStage(s)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${selectedStage === s ? "bg-[hsl(var(--primary))] text-white" : "border hover:bg-[hsl(var(--accent))]"}`}>
                            {stageLabel[s]}
                          </button>
                        ))}
                      </div>
                      <Input placeholder="Optional note..." value={note} onChange={e => setNote(e.target.value)} className="text-sm" />
                      {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(item.id)} disabled={!selectedStage}>Update</Button>
                        <Button size="sm" variant="outline" onClick={() => { setUpdating(null); setSelectedStage(""); setNote(""); setError(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setUpdating(item.id); setSelectedStage(""); }}>
                      Update status
                    </Button>
                  )}
                </div>
              )}

              {item.currentStage === "DELIVERED" && (
                <div className="text-xs text-green-600 font-medium">Delivered — lifecycle complete</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
