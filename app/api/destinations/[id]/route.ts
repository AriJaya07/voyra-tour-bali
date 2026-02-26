import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/destinations/:id
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const data = await prisma.destination.findUnique({
    where: { id: Number(id) },
  });

  return NextResponse.json(data);
}

// PUT /api/destinations/:id
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();

  const updated = await prisma.destination.update({
    where: { id: Number(id) },
    data: body,
  });

  return NextResponse.json(updated);
}

// DELETE /api/destinations/:id
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await prisma.destination.delete({
    where: { id: Number(id) },
  });

  return NextResponse.json({ message: "Deleted successfully" });
}

