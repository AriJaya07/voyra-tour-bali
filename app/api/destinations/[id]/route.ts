import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await prisma.destination.findUnique({
    where: { id: params.id },
  });

  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const updated = await prisma.destination.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.destination.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Deleted successfully" });
}