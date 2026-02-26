import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/utils/common/cloudinary";

// PATCH /api/images/[id] — update relasi destinasi atau package
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { destinationId, packageId } = body;

    const image = await prisma.image.update({
      where: { id: Number(params.id) },
      data: {
        destinationId: destinationId !== undefined ? (destinationId ? Number(destinationId) : null) : undefined,
        packageId: packageId !== undefined ? (packageId ? Number(packageId) : null) : undefined,
      },
      include: {
        destination: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(image);
  } catch {
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}

// DELETE /api/images/[id] — hapus dari Cloudinary + DB
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const image = await prisma.image.findUnique({
      where: { id: Number(params.id) },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Ekstrak public_id dari URL Cloudinary untuk delete
    const urlParts = image.url.split("/");
    const folderAndFile = urlParts.slice(-2).join("/");
    const publicId = folderAndFile.replace(/\.[^/.]+$/, ""); // hapus ekstensi

    // Hapus dari Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Hapus dari DB
    await prisma.image.delete({ where: { id: Number(params.id) } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}