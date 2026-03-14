import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { uploadImageToS3 } from "@/utils/common/s3";
import crypto from "crypto";

// POST /api/profile/upload-avatar — upload profile image
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, GIF allowed" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 2MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() || "jpg";
    const random = crypto.randomBytes(8).toString("hex");
    const key = `profile-avatars/${session.user.id}-${Date.now()}-${random}.${ext}`;

    const uploadResult = await uploadImageToS3({
      buffer,
      key,
      contentType: file.type,
    });

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { image: uploadResult.url },
    });

    return NextResponse.json({ url: uploadResult.url });
  } catch (error) {
    console.error("[Avatar Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
