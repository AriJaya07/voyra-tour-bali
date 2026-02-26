import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/utils/common/cloudinary";

// GET /api/images — semua gambar + relasi
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");
    const packageId = searchParams.get("packageId");

    const images = await prisma.image.findMany({
      where: {
        ...(destinationId ? { destinationId: Number(destinationId) } : {}),
        ...(packageId ? { packageId: Number(packageId) } : {}),
      },
      include: {
        destination: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
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

    // Convert file ke buffer lalu upload ke Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "travel-dashboard",
              resource_type: "image",
              transformation: [{ quality: "auto", fetch_format: "auto" }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as any);
            }
          )
          .end(buffer);
      }
    );

    // Simpan URL ke database
    const image = await prisma.image.create({
      data: {
        url: uploadResult.secure_url,
        destinationId: destinationId ? Number(destinationId) : null,
        packageId: packageId ? Number(packageId) : null,
      },
      include: {
        destination: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("[Image Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}