import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableGateways } from "@/lib/payments";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gateways = getAvailableGateways();
  return NextResponse.json({ gateways, activeMode: process.env.PAYMENT_MODE ?? "demo" });
}
