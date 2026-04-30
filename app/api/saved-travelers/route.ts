import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_AGE_BANDS = ["ADULT", "CHILD", "INFANT", "SENIOR", "YOUTH"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const travelers = await prisma.savedTraveler.findMany({
    where: { userId: parseInt(session.user.id) },
    orderBy: [{ isLead: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(travelers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const {
    firstName,
    lastName,
    ageBand,
    dateOfBirth,
    passportNumber,
    passportExpiry,
    nationality,
    dietaryRequirements,
    pickupHotel,
    isLead,
  } = body ?? {};

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "firstName and lastName required" }, { status: 400 });
  }
  if (!ageBand || !ALLOWED_AGE_BANDS.includes(ageBand)) {
    return NextResponse.json({ error: "Invalid ageBand" }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  const t = await prisma.$transaction(async (tx) => {
    if (isLead) {
      await tx.savedTraveler.updateMany({ where: { userId, isLead: true }, data: { isLead: false } });
    }
    return tx.savedTraveler.create({
      data: {
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ageBand,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        passportNumber: passportNumber?.trim() || null,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
        nationality: nationality?.trim() || null,
        dietaryRequirements: dietaryRequirements?.trim() || null,
        pickupHotel: pickupHotel?.trim() || null,
        isLead: !!isLead,
      },
    });
  });

  return NextResponse.json(t);
}
