import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");

    const contents = await prisma.content.findMany({
      where: destinationId ? { destinationId: Number(destinationId) } : undefined,
      include: {
        destination: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contents);
  } catch (error: any) {
    console.error("[GET /api/contents]", error?.message);
    return NextResponse.json({ error: "Failed to fetch contents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, subTitle, description,
      image1, image2, image3, image4, image5,
      imageMain, dateAvailable, isAvailable, destinationId,
    } = body;

    if (!title?.trim())
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!description?.trim())
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    if (!destinationId)
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    if (!dateAvailable)
      return NextResponse.json({ error: "Date available is required" }, { status: 400 });

    const destination = await prisma.destination.findUnique({
      where: { id: Number(destinationId) },
    });
    if (!destination)
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });

    const content = await prisma.content.create({
      data: {
        title: title.trim(),
        subTitle: subTitle?.trim() || null,
        description: description.trim(),
        image1: image1?.trim() || null,
        image2: image2?.trim() || null,
        image3: image3?.trim() || null,
        image4: image4?.trim() || null,
        image5: image5?.trim() || null,
        imageMain: imageMain?.trim() || null,
        dateAvailable: new Date(dateAvailable),
        isAvailable: isAvailable ?? true,
        destinationId: Number(destinationId),
      },
      include: {
        destination: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/contents]", error?.message);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}