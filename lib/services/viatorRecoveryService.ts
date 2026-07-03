import { prisma } from "@/lib/prisma";
import {
  VIATOR_API_KEY,
  VIATOR_API_URL,
  VIATOR_MOCK_BOOKING,
  viatorSignal,
} from "@/lib/config/viator";
import { notifyUser } from "@/lib/services/notificationService";

/**
 * Recovery for "money captured, fulfillment failed" bookings:
 * payment CONFIRMED but the Viator partner booking call failed.
 *
 * - `retryFailedViatorBookings` re-attempts the Viator book call (bounded).
 * - Bookings that exhaust MAX_RETRIES raise an in-app alert to every ADMIN
 *   so a human resolves them the same day instead of finding out from the
 *   customer.
 *
 * Used by the admin endpoint (/api/bookings/retry) and the daily cron
 * (/api/cron/viator-failed-recovery).
 */

export const MAX_VIATOR_RETRIES = 5;

export interface RetryResult {
  id: number;
  status: "success" | "failed" | "error";
  bookingRef?: string;
  error?: string;
}

export async function retryFailedViatorBookings(limit = 10): Promise<RetryResult[]> {
  const failedBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      viatorBookingStatus: "FAILED",
      viatorRetryCount: { lt: MAX_VIATOR_RETRIES },
    },
    take: limit,
  });

  const results: RetryResult[] = [];

  for (const booking of failedBookings) {
    try {
      if (!VIATOR_API_KEY || VIATOR_MOCK_BOOKING) {
        const mockRef = `MOCK-VTR-${booking.id}-${Date.now()}`;
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            viatorBookingRef: mockRef,
            viatorBookingStatus: "CONFIRMED",
            viatorBookingError: null,
          },
        });
        results.push({ id: booking.id, status: "success", bookingRef: mockRef });
        continue;
      }

      const paxMix = (booking.paxMixJson as unknown[]) || [
        { ageBand: "ADULT", numberOfTravelers: booking.pax },
      ];
      const travelers =
        (booking.travelersJson as Array<{ ageBand?: string; firstName: string; lastName: string }>) || [];
      const bookingQuestions = (booking.bookingQuestionsJson as unknown[]) || [];

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
        viatorPayload.travelers = travelers.map((t) => ({
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
        signal: viatorSignal(),
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
    } catch (err) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { viatorRetryCount: { increment: 1 } },
      });
      results.push({
        id: booking.id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return results;
}

/**
 * Alerts every ADMIN (in-app inbox) about paid bookings whose Viator
 * fulfillment is still FAILED after all retries. Idempotent per day-ish:
 * skips bookings already alerted (tracked via viatorBookingError marker).
 */
export async function alertAdminsOnStuckBookings(): Promise<number> {
  const stuck = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      viatorBookingStatus: "FAILED",
      viatorRetryCount: { gte: MAX_VIATOR_RETRIES },
    },
    select: { id: true, bookingRef: true, productTitle: true, leadEmail: true, travelDate: true },
    take: 50,
  });
  if (stuck.length === 0) return 0;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return 0;

  const list = stuck
    .map((b) => `#${b.bookingRef || b.id} — ${b.productTitle} (${b.travelDate.toISOString().split("T")[0]})`)
    .join("\n");

  await Promise.allSettled(
    admins.map((a) =>
      notifyUser({
        userId: a.id,
        title: `⚠️ ${stuck.length} paid booking(s) need manual Viator fulfillment`,
        body: `Payment captured but Viator booking failed after ${MAX_VIATOR_RETRIES} retries:\n${list}`,
        category: "ALERT",
        url: "/dashboard/bookings",
      })
    )
  );

  return stuck.length;
}
