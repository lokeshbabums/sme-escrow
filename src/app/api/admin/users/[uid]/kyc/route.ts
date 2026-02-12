import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { action, notes } = body as { action: string; notes?: string };

  if (action !== "APPROVED" && action !== "REJECTED") {
    return NextResponse.json({ error: "action must be APPROVED or REJECTED" }, { status: 400 });
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });

  const profile = await prisma.profile.findUnique({ where: { userId: uid } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const updated = await prisma.profile.update({
    where: { userId: uid },
    data: {
      kycStatus: action,
      kycVerifiedAt: new Date(),
      kycVerifiedBy: admin?.id,
      kycNotes: notes ?? null,
    },
  });

  return NextResponse.json({
    profile: {
      kycStatus: updated.kycStatus,
      kycVerifiedAt: updated.kycVerifiedAt?.toISOString(),
      kycVerifiedBy: updated.kycVerifiedBy,
      kycNotes: updated.kycNotes,
    },
  });
}
