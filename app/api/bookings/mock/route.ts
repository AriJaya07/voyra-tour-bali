import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();

    const {
      productCode,
      productTitle,
      productImage,
      productOptionCode,
      travelDate,
      startTime,
      tourGradeCode,
      paxMix,
      travelers,
      leadTraveler,
      totalPrice,
      currency,
      meetingPoint,
      languageGuide,
      bookingQuestionAnswers,
    } = body;

    // Generate a mock booking reference
    const bookingRef = `MB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const totalPax = (paxMix || []).reduce((acc: number, p: any) => acc + p.numberOfTravelers, 0);

    const booking = await prisma.booking.create({
      data: {
        userId,
        bookingRef,
        productCode,
        productTitle,
        productImage,
        totalPrice,
        currency: currency || "IDR",
        travelDate: new Date(travelDate),
        travelTime: startTime,
        meetingPoint,
        pax: totalPax,
        status: "PENDING", // Keep it pending as it's a mock/WhatsApp booking
        productOptionCode,
        tourGradeCode,
        startTime,
        paxMixJson: paxMix,
        bookingQuestionsJson: bookingQuestionAnswers,
        languageGuide,
        leadFirstName: leadTraveler?.firstName,
        leadLastName: leadTraveler?.lastName,
        leadEmail: leadTraveler?.email,
        leadPhone: leadTraveler?.phone,
        travelersJson: travelers,
        travelers: {
          create: (travelers || []).map((t: any) => ({
            firstName: t.firstName,
            lastName: t.lastName,
            fullName: `${t.firstName} ${t.lastName}`,
            ageBand: t.ageBand,
            bookingRef, // Add missing bookingRef
          })),
        },
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Error creating mock booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
