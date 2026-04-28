import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { generateTicketQR } from "@/lib/ticket";
import Container from "@/components/Container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const booking = await prisma.tourcmsBooking.findUnique({
    where: { ticketToken: token },
  });
  return {
    title: booking
      ? `Ticket — ${booking.productTitle}`
      : "Ticket Not Found",
  };
}

export default async function TourcmsTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await prisma.tourcmsBooking.findUnique({
    where: { ticketToken: token },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h2 className="text-2xl font-bold text-gray-800">Ticket Not Found</h2>
        <p className="text-gray-500">
          This ticket link is invalid or has expired.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#0071CE] text-white rounded-xl font-bold hover:bg-[#005ba6] transition"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const isValid =
    booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  const qrDataUrl = await generateTicketQR(token);
  const travelDate = booking.travelDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <Container className="">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-[#0071CE] text-white flex items-center justify-between">
            <span className="font-bold">Voyra Ticket — TourCMS</span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isValid ? "bg-green-500" : "bg-amber-500"
              }`}
            >
              {booking.status}
            </span>
          </div>
          <div className="p-6 space-y-3">
            <h1 className="text-xl font-bold">{booking.productTitle}</h1>
            <div className="text-sm text-gray-600">
              Booking Ref: {booking.bookingRef}
            </div>
            <div className="text-sm">Travel date: {travelDate}</div>
            <div className="text-sm">Pax: {booking.pax}</div>
            <div className="text-sm">
              Lead: {booking.leadFirstName} {booking.leadLastName}
            </div>
            {booking.tourcmsBookingRef && (
              <div className="text-sm text-gray-600">
                Provider Ref: {booking.tourcmsBookingRef}
              </div>
            )}

            <div className="pt-4 flex flex-col items-center">
              <Image
                src={qrDataUrl}
                alt="Ticket QR"
                width={192}
                height={192}
                unoptimized
              />
              <p className="text-xs text-gray-500 mt-2">
                Show this QR at the meeting point.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
