import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    endpoints.map((w) => ({ id: w.id, url: w.url, enabled: w.enabled, createdAt: w.createdAt }))
  );
}

const CreateSchema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const enabled = await isFeatureEnabled(user.id, "WEBHOOKS_ENABLED");
  if (!enabled) return NextResponse.json({ error: "Webhooks not enabled for your account" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const endpoint = await prisma.webhookEndpoint.create({
    data: { userId: user.id, url: parsed.data.url },
  });

  return NextResponse.json({ id: endpoint.id, url: endpoint.url, enabled: endpoint.enabled });
}

const PatchSchema = z.object({ id: z.string(), enabled: z.boolean() });

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: parsed.data.id } });
  if (!endpoint || endpoint.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhookEndpoint.update({ where: { id: parsed.data.id }, data: { enabled: parsed.data.enabled } });

  return NextResponse.json({ ok: true });
}
