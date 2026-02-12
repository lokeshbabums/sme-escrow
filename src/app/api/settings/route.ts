import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFeatures } from "@/lib/features";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true, wallet: true, webhookEndpoints: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const features = await getUserFeatures(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    profile: user.profile,
    wallet: user.wallet
      ? { availableCents: user.wallet.availableCents, heldCents: user.wallet.heldCents, currency: user.wallet.currency }
      : null,
    features,
    webhooks: user.webhookEndpoints.map((w) => ({
      id: w.id,
      url: w.url,
      enabled: w.enabled,
      createdAt: w.createdAt,
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await prisma.user.update({
    where: { email: session.user.email },
    data: { name: body.name },
  });

  return NextResponse.json({ ok: true });
}
