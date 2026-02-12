"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function NewMilestone() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("10000");
  const [existingTitles, setExistingTitles] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${params.id}/milestones`)
      .then((r) => r.json())
      .then((ms: { title: string }[]) => setExistingTitles(ms.map((m) => m.title)))
      .catch(() => {});
  }, [params.id]);

  const templates = [
    {
      title: "Pickup + Sorting",
      description: "Pickup completed. Items sorted by color/fabric. Stains noted and pre-treated.",
      amount: "1500",
    },
    {
      title: "Wash + Dry",
      description: "Wash cycle completed to spec. Dried per garment care label.",
      amount: "2500",
    },
    {
      title: "Iron",
      description: "Ironed/pressed per garment care label. Extras.",
      amount: "500",
      tag: "Extras",
    },
    {
      title: "Quality Check + Packaging",
      description: "QC pass. Items counted, folded, packed, and labeled for delivery.",
      amount: "1500",
    },
    {
      title: "Delivery + Handover",
      description: "Delivered to client. Recipient confirmation captured (name/time/photo).",
      amount: "2000",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add service stage</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Define service stage and cost.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/app/projects/${params.id}`)}>Back</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stage details</CardTitle>
          <CardDescription>Amount in INR.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => {
              const added = existingTitles.includes(t.title);
              return (
                <Button
                  key={t.title}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={added}
                  className={added ? "opacity-50 line-through" : ""}
                  onClick={() => {
                    setTitle(t.title);
                    setDescription(t.description);
                    setAmount(t.amount);
                  }}
                >
                  {added && <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />}
                  {t.title}
                  {"tag" in t && t.tag && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{t.tag}</span>}
                </Button>
              );
            })}
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acceptance criteria / proof" />
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (INR)" />
          <Button
            onClick={async () => {
              const res = await fetch(`/api/projects/${params.id}/milestones`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title, description, amountRupees: amount }),
              });
              const text = await res.text();
              let data: any = null;
              try {
                data = text ? JSON.parse(text) : null;
              } catch {}
              if (!res.ok) return alert((data?.error ?? text) || "Failed");
              router.push(`/app/projects/${params.id}`);
            }}
          >
            Add
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
