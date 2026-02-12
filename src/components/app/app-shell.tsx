"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

const nav = [
  { href: "/app", label: "Dashboard", adminOnly: false, hideForAdmin: false },
  { href: "/app/projects", label: "Orders", adminOnly: false, hideForAdmin: false },
  { href: "/app/disputes", label: "Disputes", adminOnly: false, hideForAdmin: false },
  { href: "/app/wallet", label: "Wallet", adminOnly: false, hideForAdmin: true },
  { href: "/app/invoices", label: "Invoices", adminOnly: false, hideForAdmin: false },
  { href: "/app/settings", label: "Settings", adminOnly: false, hideForAdmin: false },
  { href: "/app/onboarding", label: "KYC", adminOnly: false, hideForAdmin: true },
  { href: "/app/advances", label: "Advances", adminOnly: false, hideForAdmin: true, vendorOnly: true },
  { href: "/app/claims", label: "Claims", adminOnly: false, hideForAdmin: true, vendorOnly: true },
  { href: "/app/admin", label: "Admin", adminOnly: true, hideForAdmin: false },
  { href: "/app/admin/advances", label: "Advances", adminOnly: true, hideForAdmin: false },
  { href: "/app/admin/claims", label: "Claims", adminOnly: true, hideForAdmin: false },
  { href: "/app/admin/activity", label: "Activity", adminOnly: true, hideForAdmin: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredNav = nav.filter((i: any) => {
    const role = (data?.user as any)?.role;
    if (i.adminOnly && role !== "ADMIN") return false;
    if (i.hideForAdmin && role === "ADMIN") return false;
    if (i.vendorOnly && role !== "VENDOR") return false;
    return true;
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
        <header className="flex items-center justify-between gap-2 md:gap-4">
          <div className="min-w-0">
            <Link href="/app" className="text-sm font-semibold hover:underline md:text-base">
              LaundryEscrow
            </Link>
            <div className="truncate text-xs text-[hsl(var(--muted-foreground))] md:text-sm">
              {data?.user?.email} • {String((data?.user as any)?.role ?? "")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="hidden md:inline-flex">
              Log out
            </Button>
            <button
              className="inline-flex items-center justify-center rounded-2xl p-2 transition hover:bg-[hsl(var(--accent))] md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="mt-3 rounded-2xl border p-3 md:hidden">
            <nav className="grid gap-1">
              {filteredNav.map((i) => {
                const active = pathname === i.href || pathname.startsWith(i.href + "/");
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm transition",
                      active ? "bg-[hsl(var(--secondary))]" : "hover:bg-[hsl(var(--accent))]",
                    )}
                  >
                    {i.label}
                  </Link>
                );
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-[hsl(var(--accent))]"
              >
                Log out
              </button>
            </nav>
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="hidden rounded-2xl border p-3 h-fit md:block">
            <nav className="grid gap-1">
              {filteredNav.map((i) => {
                const active = pathname === i.href || pathname.startsWith(i.href + "/");
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm transition",
                      active ? "bg-[hsl(var(--secondary))]" : "hover:bg-[hsl(var(--accent))]",
                    )}
                  >
                    {i.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
