import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import { getRateToIdr } from "@/lib/services/tourcmsFx";
import { TOURCMS_MOCK } from "@/lib/config/tourcms";
import {
  TOURCMS_ORDER_PREFIX,
  tourcmsSnap,
} from "@/lib/config/tourcms-midtrans";
import type { TourcmsPaxMixEntry } from "@/types/tourcms";

export interface StartTourcmsBookingInput {
  userId: number;
  productCode: string;
  componentKey: string;
  productOptionCode?: string;
  productTitle: string;
  productImage?: string | null;
  travelDate: string;
  travelTime?: string | null;
  paxMix: TourcmsPaxMixEntry[];
  totalPriceSource: number;
  currencySource: string;
  travelers: { firstName: string; lastName: string; ageBand: string }[];
  leadFirstName: string;
  leadLastName: string;
  leadEmail: string;
  leadPhone: string;
  meetingPoint?: string | null;
  idempotencyKey?: string;
}

export interface StartTourcmsBookingResult {
  bookingId: number;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  totalPriceIdr: number;
  fxRateToIdr: number;
}

function parseProductCode(code: string) {
  const [c, t] = code.split(":");
  return { channelId: Number(c), tourId: Number(t) };
}

function totalPax(paxMix: TourcmsPaxMixEntry[]): number {
  return paxMix.reduce((s, p) => s + (p.numberOfTravelers || 0), 0) || 1;
}

function buildIdempotencyKey(input: StartTourcmsBookingInput): string {
  if (input.idempotencyKey) return input.idempotencyKey.slice(0, 64);
  return crypto
    .createHash("sha256")
    .update(
      `${input.userId}-${input.productCode}-${input.travelDate}-${Date.now()}`
    )
    .digest("hex")
    .substring(0, 32);
}

export async function startTourcmsBooking(
  input: StartTourcmsBookingInput
): Promise<StartTourcmsBookingResult> {
  const { channelId, tourId } = parseProductCode(input.productCode);
  if (!channelId || !tourId) {
    throw new Error("Invalid productCode");
  }

  const idempotencyKey = buildIdempotencyKey(input);

  const existing = await prisma.tourcmsBooking.findUnique({
    where: { idempotencyKey },
  });
  if (existing && existing.snapToken && existing.paymentId) {
    return {
      bookingId: existing.id,
      orderId: existing.paymentId,
      snapToken: existing.snapToken,
      redirectUrl: "",
      totalPriceIdr: existing.totalPrice,
      fxRateToIdr: existing.fxRateToIdr,
    };
  }

  const fxRateToIdr = await getRateToIdr(input.currencySource);
  const totalPriceIdr = Math.round(input.totalPriceSource * fxRateToIdr);
  const pax = totalPax(input.paxMix);

  let tourcmsHoldId: string | null = null;
  if (!TOURCMS_MOCK) {
    if (!input.componentKey) {
      throw new Error("componentKey required for TourCMS booking start");
    }
    const hold = await tourcmsClient.startBooking({
      channelId,
      tourId,
      componentKey: input.componentKey,
      travelDate: input.travelDate,
      paxMix: input.paxMix,
      totalCustomers: pax,
      travelers: input.travelers,
      bookerInfo: {
        firstName: input.leadFirstName,
        lastName: input.leadLastName,
        email: input.leadEmail,
        phone: input.leadPhone,
      },
    });
    tourcmsHoldId = hold.tourcmsHoldId;

    if (hold.customerId) {
      try {
        await tourcmsClient.updateCustomer({
          channelId,
          customerId: hold.customerId,
          firstName: input.leadFirstName,
          lastName: input.leadLastName,
          email: input.leadEmail,
          phone: input.leadPhone,
        });
      } catch (err) {
        console.error(
          "[TourCMS] updateCustomer failed:",
          err instanceof Error ? err.message : "Unknown"
        );
      }
    }
  } else {
    tourcmsHoldId = `MOCK-HOLD-${Date.now()}`;
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.tourcmsBooking.create({
      data: {
        userId: input.userId,
        bookingRef: "",
        channelId,
        productCode: input.productCode,
        productOptionCode: input.productOptionCode || null,
        productTitle: input.productTitle,
        productImage: input.productImage || null,
        currencySource: input.currencySource.toUpperCase(),
        totalPriceSource: input.totalPriceSource,
        fxRateToIdr,
        totalPrice: totalPriceIdr,
        currency: "IDR",
        travelDate: new Date(input.travelDate),
        travelTime: input.travelTime || null,
        meetingPoint: input.meetingPoint || null,
        pax,
        status: "PENDING",
        leadFirstName: input.leadFirstName,
        leadLastName: input.leadLastName,
        leadEmail: input.leadEmail,
        leadPhone: input.leadPhone,
        paxMixJson: input.paxMix as unknown as object,
        travelersJson: input.travelers as unknown as object,
        idempotencyKey,
        tourcmsHoldId,
      },
    });

    if (input.travelers.length > 0) {
      await tx.tourcmsBookingTraveler.createMany({
        data: input.travelers.map((t) => ({
          bookingId: created.id,
          bookingRef: "",
          firstName: t.firstName || "",
          lastName: t.lastName || "",
          fullName: `${t.firstName || ""} ${t.lastName || ""}`.trim(),
          ageBand: t.ageBand || "ADULT",
        })),
      });
    }

    return created;
  });

  const siteUrl = process.env.NEXTAUTH_URL;
  if (!siteUrl) {
    throw new Error("Missing required environment variable: NEXTAUTH_URL");
  }

  const orderId = `${TOURCMS_ORDER_PREFIX}${booking.id}-${Date.now()}`;
  const perItem = Math.max(1, Math.round(totalPriceIdr / pax));
  const grossAmount = perItem * pax;

  const snapParameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: input.productCode,
        price: perItem,
        quantity: pax,
        name: input.productTitle.substring(0, 50),
      },
    ],
    customer_details: {
      first_name: input.leadFirstName,
      last_name: input.leadLastName,
      email: input.leadEmail,
      phone: input.leadPhone,
    },
    callbacks: {
      finish: `${siteUrl}/tourcms/booking-success?orderId=${orderId}`,
      unfinish: `${siteUrl}/tourcms/booking-success?orderId=${orderId}`,
      error: `${siteUrl}/tourcms/booking-success?orderId=${orderId}`,
    },
  };

  const snapResponse = await tourcmsSnap.createTransaction(snapParameter);

  await prisma.tourcmsBooking.update({
    where: { id: booking.id },
    data: {
      paymentId: orderId,
      snapToken: snapResponse.token,
      bookingRef: orderId,
    },
  });

  await prisma.tourcmsBookingTraveler.updateMany({
    where: { bookingId: booking.id },
    data: { bookingRef: orderId },
  });

  return {
    bookingId: booking.id,
    orderId,
    snapToken: snapResponse.token,
    redirectUrl: snapResponse.redirect_url,
    totalPriceIdr,
    fxRateToIdr,
  };
}
