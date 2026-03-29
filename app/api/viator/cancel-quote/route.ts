import { NextResponse } from 'next/server';
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from '@/lib/config/viator';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingRef = searchParams.get('bookingRef');

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    // Fallback Mock for Certification
    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        bookingRef,
        refundDetails: {
          refundAmount: 120,
          currencyCode: "USD"
        },
        status: "CANCELLABLE"
      });
    }

    const viatorResponse = await fetch(`${VIATOR_API_URL}/bookings/${bookingRef}/cancel-quote`, {
      method: 'GET',
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
    });

    const data = await viatorResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
