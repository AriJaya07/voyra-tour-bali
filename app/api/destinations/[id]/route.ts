import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/destinations/:id
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const data = await prisma.destination.findUnique({
      where: { id: Number(id) },
    });
  
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/destinations/:id
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();

  try {
    const updated = await prisma.destination.update({
      where: { id: Number(id) },
      data: body,
    });
  
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/destinations/:id
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await prisma.destination.delete({
      where: { id: Number(id) },
    });
  
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

