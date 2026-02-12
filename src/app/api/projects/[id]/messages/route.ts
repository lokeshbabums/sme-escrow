import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateMessage = z.object({
  body: z.string().min(1).max(4000),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && project.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      attachments: { select: { id: true, fileName: true, sizeBytes: true } },
    },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "ADMIN") {
    if (role === "CLIENT" && project.clientId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "VENDOR" && project.vendorId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateMessage.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      projectId: id,
      senderId: me.id,
      body: parsed.data.body,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      attachments: { select: { id: true, fileName: true, sizeBytes: true } },
    },
  });

  if (parsed.data.fileName) {
    const attachment = await prisma.fileAttachment.create({
      data: {
        uploaderId: me.id,
        fileName: parsed.data.fileName,
        sizeBytes: parsed.data.fileSize ?? null,
        messageId: message.id,
      },
    });
    message.attachments = [{ id: attachment.id, fileName: attachment.fileName, sizeBytes: attachment.sizeBytes }];
  }

  return NextResponse.json({ message });
}
