import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { key, enabled } = body as { key: string; enabled: boolean };

  if (!FEATURES.includes(key as any)) {
    return NextResponse.json({ error: "Invalid feature key" }, { status: 400 });
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });

  const flag = await prisma.featureFlag.upsert({
    where: { userId_key: { userId: uid, key } },
    update: { enabled },
    create: { userId: uid, key, enabled, createdById: admin?.id },
  });

  return NextResponse.json({ flag: { key: flag.key, enabled: flag.enabled } });
}
