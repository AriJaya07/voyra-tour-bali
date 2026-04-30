import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_AGE_BANDS = ["ADULT", "CHILD", "INFANT", "SENIOR", "YOUTH"];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const travelerId = parseInt(id);
  if (Number.isNaN(travelerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const userId = parseInt(session.user.id);
  const existing = await prisma.savedTraveler.findFirst({ where: { id: travelerId, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.firstName === "string") data.firstName = body.firstName.trim();
  if (typeof body.lastName === "string") data.lastName = body.lastName.trim();
  if (body.ageBand && ALLOWED_AGE_BANDS.includes(body.ageBand)) data.ageBand = body.ageBand;
  if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (body.passportNumber !== undefined) data.passportNumber = body.passportNumber?.trim() || null;
  if (body.passportExpiry !== undefined) data.passportExpiry = body.passportExpiry ? new Date(body.passportExpiry) : null;
  if (body.nationality !== undefined) data.nationality = body.nationality?.trim() || null;
  if (body.dietaryRequirements !== undefined) data.dietaryRequirements = body.dietaryRequirements?.trim() || null;
  if (body.pickupHotel !== undefined) data.pickupHotel = body.pickupHotel?.trim() || null;

  if (body.isLead === true) {
    await prisma.$transaction([
      prisma.savedTraveler.updateMany({ where: { userId, isLead: true }, data: { isLead: false } }),
      prisma.savedTraveler.update({ where: { id: travelerId }, data: { ...data, isLead: true } }),
    ]);
  } else {
    if (body.isLead === false) data.isLead = false;
    await prisma.savedTraveler.update({ where: { id: travelerId }, data });
  }

  const updated = await prisma.savedTraveler.findUnique({ where: { id: travelerId } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const travelerId = parseInt(id);
  if (Number.isNaN(travelerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const userId = parseInt(session.user.id);
  const result = await prisma.savedTraveler.deleteMany({ where: { id: travelerId, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
