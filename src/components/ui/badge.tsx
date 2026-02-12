import * as React from "react";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
  outline: "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]",
  destructive: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", variants[variant] ?? variants.default, className)}
      {...props}
    />
  );
}
