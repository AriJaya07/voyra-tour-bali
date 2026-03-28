import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/config/midtrans";
import crypto from "crypto";

export interface LocalBookingInput {
  userId: number;
  productCode: string;
  productTitle: string;
  productImage?: string;
  travelDate: string;
  pax: number;
  totalPrice: number;
  currency?: string;
  leadFirstName?: string;
  leadLastName?: string;
  leadEmail?: string;
  leadPhone?: string;
  travelers?: Array<{
    firstName: string;
    lastName: string;
    ageBand: string;
  }>;
  meetingPoint?: string;
  notes?: string;
}

export interface LocalBookingResult {
  bookingId: number;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
}

/**
 * Creates a LOCAL booking in the database and generates a Midtrans payment.
 *
 * Flow:
 *   1. Create booking record (PENDING)
 *   2. Create traveler records
 *   3. Generate Midtrans Snap transaction
 *   4. Update booking with payment info
 *   5. Return payment URL
 */
export async function createLocalBooking(
  input: LocalBookingInput
): Promise<LocalBookingResult> {
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${input.userId}-${input.productCode}-${input.travelDate}-${Date.now()}`)
    .digest("hex")
    .substring(0, 32);

  // 1. Create booking in DB
  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      bookingRef: "",
      productCode: input.productCode,
      productTitle: input.productTitle,
      productImage: input.productImage || null,
      totalPrice: Math.round(Number(input.totalPrice)),
      currency: input.currency || "IDR",
      travelDate: new Date(input.travelDate),
      pax: Number(input.pax),
      meetingPoint: input.meetingPoint || null,
      leadFirstName: input.leadFirstName || null,
      leadLastName: input.leadLastName || null,
      leadEmail: input.leadEmail || null,
      leadPhone: input.leadPhone || null,
      idempotencyKey,
      status: "PENDING",
    },
  });

  // 2. Create traveler records
  if (input.travelers?.length) {
    await prisma.bookingTraveler.createMany({
      data: input.travelers.map((t) => ({
        bookingId: booking.id,
        bookingRef: "",
        firstName: t.firstName || "",
        lastName: t.lastName || "",
        fullName: `${t.firstName || ""} ${t.lastName || ""}`.trim(),
        ageBand: t.ageBand || "ADULT",
      })),
    });
  }

  // 3. Generate Midtrans transaction
  const orderId = `VOYRA-${booking.id}-${Date.now()}`;
  const perItemPrice = Math.round(Number(input.totalPrice) / Number(input.pax));
  const grossAmount = perItemPrice * Number(input.pax);

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: input.productCode,
        price: perItemPrice,
        quantity: Number(input.pax),
        name: input.productTitle.substring(0, 50),
      },
    ],
    customer_details: {
      first_name: input.leadFirstName || "Guest",
      last_name: input.leadLastName || "",
      email: input.leadEmail || "",
      phone: input.leadPhone || "",
    },
    callbacks: {
      finish: `${process.env.NEXTAUTH_URL}/payment/success`,
      unfinish: `${process.env.NEXTAUTH_URL}/payment/pending`,
      error: `${process.env.NEXTAUTH_URL}/payment/error`,
    },
  };

  const snapResponse = await snap.createTransaction(parameter);

  // 4. Update booking with payment info
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentId: orderId,
      snapToken: snapResponse.token,
      bookingRef: orderId,
    },
  });

  // Update traveler bookingRefs
  await prisma.bookingTraveler.updateMany({
    where: { bookingId: booking.id },
    data: { bookingRef: orderId },
  });

  return {
    bookingId: booking.id,
    orderId,
    snapToken: snapResponse.token,
    redirectUrl: snapResponse.redirect_url,
  };
}
