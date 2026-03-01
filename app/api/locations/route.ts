import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");

    const locations = await prisma.location.findMany({
      where: destinationId ? { destinationId: Number(destinationId) } : undefined,
      include: {
        destination: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error("Full error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, image, hrefLink, description, destinationId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!destinationId) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }

    const destination = await prisma.destination.findUnique({
      where: { id: Number(destinationId) },
    });
    if (!destination) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });
    }

    const location = await prisma.location.create({
      data: {
        title: title.trim(),
        image: image?.trim() || null,
        hrefLink: hrefLink?.trim() || null,
        description: description?.trim() || null,
        destinationId: Number(destinationId),
      },
      include: {
        destination: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    console.error("Meta:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create location" },
      { status: 500 }
    );
  }
}