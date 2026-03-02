import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const destinations = await prisma.destination.findMany({
      include: {
        category: true,
        images: true,
        packages: true,
        contents: true,
        locations: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(destinations);
  } catch (error) {
    console.error("Error fetching destinations:", error);
    return NextResponse.json(
      { error: "Failed to fetch destinations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, price, categoryId } = body;

    if (!title || !description || price === undefined || price === null || !categoryId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const destination = await prisma.destination.create({
      data: {
        title,
        description,
        price: Number(price),
        categoryId: Number(categoryId),
      },
    });
    return NextResponse.json(destination, { status: 201 });
  } catch (error) {
    console.error("Error creating destination:", error);
    return NextResponse.json(
      { error: "Failed to create destination" },
      { status: 500 }
    );
  }
}
