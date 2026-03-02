import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImageToS3 } from "@/utils/common/s3";
import crypto from "crypto";

// GET /api/images — semua gambar + relasi
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");
    const packageId = searchParams.get("packageId");
    const contentId = searchParams.get("contentId");
    const locationId = searchParams.get("locationId");

    const images = await prisma.image.findMany({
      where: {
        ...(destinationId ? { destinationId: Number(destinationId) } : {}),
        ...(packageId ? { packageId: Number(packageId) } : {}),
        ...(contentId ? { contentId: Number(contentId) } : {}),
        ...(locationId ? { locationId: Number(locationId) } : {}),
      },
      include: {
        destination: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
        content: { select: { id: true, title: true } },
        location: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(images);
  } catch {
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}

// POST /api/images — upload ke Cloudinary lalu simpan URL ke DB
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const destinationId = formData.get("destinationId") as string | null;
    const packageId = formData.get("packageId") as string | null;
    const contentId = formData.get("contentId") as string | null;
    const locationId = formData.get("locationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, GIF allowed" }, { status: 400 });
    }

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    // Convert file ke buffer lalu upload ke S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "jpg";
    const random = crypto.randomBytes(8).toString("hex");
    const key = `travel-dashboard/${Date.now()}-${random}.${ext}`;

    const uploadResult = await uploadImageToS3({
      buffer,
      key,
      contentType: file.type,
    });

    // Simpan URL & key ke database
    const image = await prisma.image.create({
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        destinationId: destinationId ? Number(destinationId) : null,
        packageId: packageId ? Number(packageId) : null,
        contentId: contentId ? Number(contentId) : null,
        locationId: locationId ? Number(locationId) : null,
      },
      include: {
        destination: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
        content: { select: { id: true, title: true } },
        location: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("[Image Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}