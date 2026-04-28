import { prisma } from "@/lib/prisma";
import { generateTicketToken } from "@/lib/ticket";
import { sendBookingConfirmation } from "@/lib/email";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import { TOURCMS_MOCK } from "@/lib/config/tourcms";

const TOURCMS_SUPPRESS_VENDOR_EMAIL =
  process.env.TOURCMS_SUPPRESS_VENDOR_EMAIL === "true";

const TERMINAL_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"] as const;

async function commitWithTourcms(
  bookingId: number
): Promise<{ success: boolean; bookingRef?: string | null; voucherUrl?: string | null; error?: string }> {
  const booking = await prisma.tourcmsBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) return { success: false, error: "Not found" };

  if (TOURCMS_MOCK) {
    return {
      success: true,
      bookingRef: `MOCK-TC-${booking.id}-${Date.now()}`,
      voucherUrl: null,
    };
  }
  if (!booking.tourcmsHoldId) {
    return { success: false, error: "Missing TourCMS hold id" };
  }

  const result = await tourcmsClient.commitBooking({
    channelId: booking.channelId,
    tourcmsHoldId: booking.tourcmsHoldId,
    agentRef: booking.paymentId || booking.bookingRef,
    suppressEmail: TOURCMS_SUPPRESS_VENDOR_EMAIL,
  });
  return {
    success: result.success,
    bookingRef: result.tourcmsBookingRef,
    voucherUrl: result.voucherUrl,
    error: result.error || undefined,
  };
}

export async function handleTourcmsPaymentSuccess(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const booking = await prisma.tourcmsBooking.findUnique({
      where: { paymentId: orderId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!booking) return { success: false, error: "Booking not found" };

    if (TERMINAL_STATUSES.includes(booking.status as typeof TERMINAL_STATUSES[number])) {
      return { success: true };
    }

    const ticketToken = booking.ticketToken || generateTicketToken();

    await prisma.tourcmsBooking.update({
      where: { paymentId: orderId },
      data: {
        status: "CONFIRMED",
        paidAt: booking.paidAt || new Date(),
        ticketToken,
      },
    });

    console.log(`[TourCMS][PostPayment] ${orderId} → CONFIRMED`);

    if (booking.tourcmsBookingRef) {
      console.log(
        `[TourCMS] Already committed: ${booking.tourcmsBookingRef}, skipping`
      );
    } else {
      const commit = await commitWithTourcms(booking.id);
      if (commit.success) {
        await prisma.tourcmsBooking.update({
          where: { id: booking.id },
          data: {
            tourcmsBookingRef: commit.bookingRef || null,
            tourcmsBookingStatus: "CONFIRMED",
            tourcmsVoucherUrl: commit.voucherUrl || null,
            tourcmsCommitError: null,
          },
        });
      } else {
        await prisma.tourcmsBooking.update({
          where: { id: booking.id },
          data: {
            tourcmsBookingStatus: "FAILED",
            tourcmsCommitError: commit.error || "Unknown error",
            tourcmsRetryCount: { increment: 1 },
          },
        });
        console.error(
          `[CRITICAL] Payment OK but TourCMS commit FAILED for ${orderId}. Manual intervention needed.`
        );
      }
    }

    if (ticketToken && booking.user?.email && !booking.voucherEmailed) {
      sendBookingConfirmation({
        email: booking.user.email,
        userName: booking.user.name || "",
        bookingRef: booking.bookingRef,
        productTitle: booking.productTitle,
        travelDate: booking.travelDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        pax: booking.pax,
        totalPrice: `Rp ${Math.round(booking.totalPrice).toLocaleString("id-ID")}`,
        ticketToken,
      })
        .then(() =>
          prisma.tourcmsBooking.update({
            where: { id: booking.id },
            data: { voucherEmailed: true },
          })
        )
        .catch((err) => {
          console.error(
            "[Email] Failed to send TourCMS booking confirmation:",
            err instanceof Error ? err.message : "Unknown"
          );
        });
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error(`[TourCMS][PostPayment] Error processing ${orderId}:`, msg);
    return { success: false, error: msg };
  }
}

export async function retryTourcmsCommit(bookingId: number): Promise<boolean> {
  const booking = await prisma.tourcmsBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) return false;
  if (booking.status !== "CONFIRMED") return false;
  if (booking.tourcmsBookingRef) return true;

  const commit = await commitWithTourcms(bookingId);
  if (commit.success) {
    await prisma.tourcmsBooking.update({
      where: { id: bookingId },
      data: {
        tourcmsBookingRef: commit.bookingRef || null,
        tourcmsBookingStatus: "CONFIRMED",
        tourcmsVoucherUrl: commit.voucherUrl || null,
        tourcmsCommitError: null,
      },
    });
    return true;
  }
  await prisma.tourcmsBooking.update({
    where: { id: bookingId },
    data: {
      tourcmsCommitError: commit.error || "Unknown error",
      tourcmsRetryCount: { increment: 1 },
    },
  });
  return false;
}
