import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { generateTicketQR } from '@/lib/ticket'
import Container from '@/components/Container'
import Link from 'next/link'
import CancelButtonClient from './CancelButtonClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const booking = await prisma.booking.findUnique({ where: { ticketToken: token } })

  return {
    title: booking
      ? `Ticket — ${booking.productTitle}`
      : 'Ticket Not Found',
  }
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const booking = await prisma.booking.findUnique({
    where: { ticketToken: token },
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h2 className="text-2xl font-bold text-gray-800">Ticket Not Found</h2>
        <p className="text-gray-500">This ticket link is invalid or has expired.</p>
        <Link href="/" className="px-6 py-3 bg-[#0071CE] text-white rounded-xl font-bold hover:bg-[#005ba6] transition">
          Back to Home
        </Link>
      </div>
    )
  }

  const isValid = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
  const qrDataUrl = await generateTicketQR(token)
  const travelDate = booking.travelDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <Container>
        <div className="max-w-md mx-auto">
          {/* Ticket card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-5 text-center ${
              isValid ? 'bg-gradient-to-r from-[#00E7FF] to-[#0097E8]' : 'bg-gray-400'
            }`}>
              <p className="text-white/80 text-xs font-medium tracking-wider uppercase mb-1">
                Voyra Bali Tour
              </p>
              <h1 className="text-white text-lg font-bold">
                {isValid ? 'E-Ticket' : 'Invalid Ticket'}
              </h1>
            </div>

            {/* Status badge */}
            <div className="flex justify-center -mt-4">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                booking.status === 'CONFIRMED' ? 'bg-green-500 text-white'
                  : booking.status === 'COMPLETED' ? 'bg-blue-500 text-white'
                  : booking.status === 'CANCELLED' ? 'bg-red-500 text-white'
                  : 'bg-yellow-400 text-yellow-900'
              }`}>
                {booking.status}
              </span>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {/* QR Code */}
              {isValid && (
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="Ticket QR Code"
                      width={220}
                      height={220}
                      className="w-[220px] h-[220px]"
                    />
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Booking Ref</span>
                  <span className="font-bold text-gray-900 text-right">{booking.bookingRef}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Tour</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px] leading-tight">
                    {booking.productTitle}
                  </span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Guest</span>
                  <span className="font-medium text-gray-900">{booking.user.name || booking.user.email}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">{travelDate}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Travelers</span>
                  <span className="font-medium text-gray-900">{booking.pax} person(s)</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-bold text-lg text-gray-900">
                    Rp {Math.round(booking.totalPrice).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              {isValid && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-blue-700 text-xs font-medium leading-relaxed">
                    Show this QR code at the destination for entry.
                    <br />
                    Staff will scan it to verify your booking.
                  </p>
                </div>
              )}

              {!isValid && (
                <div className="mt-6 p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-red-700 text-xs font-medium">
                    This ticket is not valid for entry. Status: {booking.status}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <Link
                  href="/profile"
                  className="flex-1 text-center py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
                >
                  My Bookings
                </Link>
                <Link
                  href="/"
                  className="flex-1 text-center py-3 bg-[#0071CE] text-white rounded-xl text-sm font-semibold hover:bg-[#005ba6] transition"
                >
                  Explore More
                </Link>
              </div>
              {isValid && booking.bookingRef && (
                <CancelButtonClient bookingRef={booking.bookingRef} token={token} />
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
