import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Ticket verification endpoint — scanned by staff at destination.
 * Returns booking status + details for validation.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Missing ticket token' }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { ticketToken: token },
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  if (!booking) {
    return NextResponse.json({ valid: false, error: 'Ticket not found' }, { status: 404 })
  }

  const isValid = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'

  return NextResponse.json({
    valid: isValid,
    booking: {
      bookingRef: booking.bookingRef,
      productTitle: booking.productTitle,
      travelDate: booking.travelDate.toISOString().split('T')[0],
      pax: booking.pax,
      status: booking.status,
      userName: booking.user.name,
      userEmail: booking.user.email,
      paidAt: booking.paidAt?.toISOString() || null,
    },
  })
}
