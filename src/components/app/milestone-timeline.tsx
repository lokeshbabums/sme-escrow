import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Banknote, 
  CheckCircle, 
  Upload, 
  AlertTriangle, 
  Clock,
  ArrowDownCircle,
  CircleDot
} from "lucide-react";

interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  note: string | null;
  createdAt: string | Date;
  milestone: {
    title: string;
  };
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

const typeConfig: Record<string, { icon: typeof Banknote; color: string; label: string }> = {
  DEPOSIT: { icon: ArrowDownCircle, color: "text-blue-600 bg-blue-100", label: "Escrow Funded" },
  RELEASE: { icon: CheckCircle, color: "text-green-600 bg-green-100", label: "Payment Released" },
  PARTIAL_RELEASE: { icon: Banknote, color: "text-emerald-600 bg-emerald-100", label: "Partial Release" },
  PROOF_SUBMITTED: { icon: Upload, color: "text-purple-600 bg-purple-100", label: "Proof Submitted" },
  DISPUTE_OPENED: { icon: AlertTriangle, color: "text-red-600 bg-red-100", label: "Dispute Opened" },
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MilestoneTimeline({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Activity Timeline</CardTitle>
          <CardDescription>All escrow movements for this order.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Activity Timeline</CardTitle>
        <CardDescription>All escrow movements for this order.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[hsl(var(--border))]" />

          <div className="space-y-6">
            {entries.map((entry) => {
              const config = typeConfig[entry.type] ?? {
                icon: CircleDot,
                color: "text-gray-600 bg-gray-100",
                label: entry.type,
              };
              const Icon = config.icon;

              return (
                <div key={entry.id} className="relative flex gap-4 pl-0">
                  {/* Icon circle */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{config.label}</span>
                      <Badge variant="outline" className="text-xs">{entry.milestone.title}</Badge>
                      {entry.amountCents > 0 && (
                        <span className="text-sm font-semibold">{money(entry.amountCents)}</span>
                      )}
                    </div>
                    {entry.note && (
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.note}</p>
                    )}
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
