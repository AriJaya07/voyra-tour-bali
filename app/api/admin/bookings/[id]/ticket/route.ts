import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { uploadImageToS3 } from "@/utils/common/s3";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session?.user?.id || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WEBP are allowed." },
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Upload to S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() || "jpg";
    const random = crypto.randomBytes(4).toString("hex");
    const key = `tickets/booking-${id}-${Date.now()}-${random}.${ext}`;

    const { url } = await uploadImageToS3({
      buffer,
      key,
      contentType: file.type,
    });

    // Update booking with the new ticket image URL
    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: { ticketImageUrl: url },
    });

    return NextResponse.json({ 
      success: true, 
      ticketImageUrl: url,
      booking: updated 
    });
  } catch (error: any) {
    console.error("[Ticket Upload Error]", error?.message);
    return NextResponse.json(
      { error: "Failed to upload ticket image" },
      { status: 500 }
    );
  }
}
