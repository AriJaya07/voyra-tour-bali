import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const destinations = await prisma.destination.findMany({
    include: {
      category: true,
    },
  });
  return NextResponse.json(destinations);
}

export async function POST(req: Request) {
  const { title, description, price, categoryId } = await req.json();

  if (!title || !description || !price || !categoryId) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  try {
    const destination = await prisma.destination.create({
      data: {
        title,
        description,
        price,
        categoryId,
      },
    });
    return NextResponse.json(destination);
  } catch (error) {
    console.error("Error creating destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
