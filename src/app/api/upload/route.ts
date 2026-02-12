import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
  const safeName = `${randomUUID()}${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await writeFile(join(uploadDir, safeName), buffer);

  return NextResponse.json({
    url: `/uploads/${safeName}`,
    fileName: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  });
}
