import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { VIATOR_API_KEY, VIATOR_API_URL } from "@/lib/config/viator";
const MAX_RETRIES = 5;

/**
 * POST /api/bookings/retry
 * Retry failed Viator bookings (payment succeeded but Viator call failed).
 * Admin-only endpoint.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all paid bookings where Viator booking failed
    const failedBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        viatorBookingStatus: "FAILED",
        viatorRetryCount: { lt: MAX_RETRIES },
      },
      take: 10,
    });

    if (failedBookings.length === 0) {
      return NextResponse.json({ message: "No failed bookings to retry", retried: 0 });
    }

    const results = [];

    for (const booking of failedBookings) {
      try {
        if (!VIATOR_API_KEY) {
          results.push({ id: booking.id, status: "skipped", reason: "No API key" });
          continue;
        }

        const paxMix = (booking.paxMixJson as any[]) || [
          { ageBand: "ADULT", numberOfTravelers: booking.pax },
        ];

        const travelers = (booking.travelersJson as any[]) || [];
        const bookingQuestions = (booking.bookingQuestionsJson as any[]) || [];

        const viatorPayload: Record<string, unknown> = {
          productCode: booking.productCode,
          travelDate: booking.travelDate.toISOString().split("T")[0],
          paxMix,
          bookerInfo: {
            firstName: booking.leadFirstName || "Guest",
            lastName: booking.leadLastName || "",
          },
          communication: {
            email: booking.leadEmail || "",
            phone: booking.leadPhone || "",
          },
        };

        if (booking.productOptionCode) viatorPayload.productOptionCode = booking.productOptionCode;
        if (booking.tourGradeCode) viatorPayload.tourGradeCode = booking.tourGradeCode;
        if (booking.startTime) viatorPayload.startTime = booking.startTime;
        if (travelers.length > 0) {
          viatorPayload.travelers = travelers.map((t: any) => ({
            ageBand: t.ageBand || "ADULT",
            firstName: t.firstName,
            lastName: t.lastName,
          }));
          viatorPayload.leadTraveler = {
            firstName: booking.leadFirstName || travelers[0]?.firstName,
            lastName: booking.leadLastName || travelers[0]?.lastName,
            email: booking.leadEmail,
            phone: booking.leadPhone,
          };
        }
        if (bookingQuestions.length > 0) viatorPayload.bookingQuestions = bookingQuestions;

        const res = await fetch(`${VIATOR_API_URL}/bookings/book`, {
          method: "POST",
          headers: {
            Accept: "application/json;version=2.0",
            "Content-Type": "application/json",
            "exp-api-key": VIATOR_API_KEY,
          },
          body: JSON.stringify(viatorPayload),
        });

        const data = await res.json();

        if (res.ok && data.bookingRef) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              viatorBookingRef: data.bookingRef,
              viatorBookingStatus: "CONFIRMED",
              viatorVoucherUrl: data.voucherInfo?.url || null,
              viatorBookingError: null,
            },
          });
          results.push({ id: booking.id, status: "success", bookingRef: data.bookingRef });
        } else {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              viatorRetryCount: { increment: 1 },
              viatorBookingError: data.message || "Retry failed",
            },
          });
          results.push({ id: booking.id, status: "failed", error: data.message });
        }
      } catch (err: any) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { viatorRetryCount: { increment: 1 } },
        });
        results.push({ id: booking.id, status: "error", error: err?.message });
      }
    }

    return NextResponse.json({ message: "Retry complete", retried: results.length, results });
  } catch (error: any) {
    console.error("Retry error:", error?.message);
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}
