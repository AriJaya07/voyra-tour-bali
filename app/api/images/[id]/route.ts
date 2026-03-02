import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImageFromS3 } from "@/utils/common/s3";

// PATCH /api/images/[id] — update relasi destinasi atau package
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { destinationId, packageId } = body;

    const image = await prisma.image.update({
      where: { id: Number(id) },
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
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const image = await prisma.image.findUnique({
      where: { id: Number(id) },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Hapus file di S3 berdasarkan key yang tersimpan
    if (image.key) {
      await deleteImageFromS3(image.key);
    }

    // Hapus dari DB
    await prisma.image.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}