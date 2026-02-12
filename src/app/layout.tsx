import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaundryEscrow — Trusted Escrow for Laundry Services",
  description: "Milestone-based escrow for laundry pickup, wash, and delivery services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
