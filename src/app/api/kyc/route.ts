import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  docType: z.enum(["Aadhaar", "PAN", "Passport"]),
  docNumber: z.string().min(4).max(30),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  businessName: z.string().optional(),
  serviceAreas: z.string().optional(),
  experience: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { profile: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const extraData = JSON.stringify({
    phone: parsed.data.phone,
    address: parsed.data.address,
    city: parsed.data.city,
    pincode: parsed.data.pincode,
    businessName: parsed.data.businessName,
    serviceAreas: parsed.data.serviceAreas,
    experience: parsed.data.experience,
  });

  if (!user.profile) {
    await prisma.profile.create({
      data: { userId: user.id, docType: parsed.data.docType, docNumber: parsed.data.docNumber, kycStatus: "PENDING", bio: extraData },
    });
  } else {
    await prisma.profile.update({
      where: { userId: user.id },
      data: { docType: parsed.data.docType, docNumber: parsed.data.docNumber, kycStatus: "PENDING", kycNotes: null, bio: extraData },
    });
  }

  return NextResponse.json({ ok: true });
}
