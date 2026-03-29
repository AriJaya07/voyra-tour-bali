import { NextResponse } from 'next/server';
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from '@/lib/config/viator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingRef, reasonCode } = body;

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    // Fallback Mock for Certification
    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        bookingRef,
        status: "CANCELLED"
      });
    }

    const viatorResponse = await fetch(`${VIATOR_API_URL}/bookings/${bookingRef}/cancel`, {
      method: 'POST',
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify({ reasonCode: reasonCode || "CUSTOMER_REQUEST" })
    });

    const data = await viatorResponse.json();
    if (!viatorResponse.ok) {
      return NextResponse.json({ error: data.message || "Failed to cancel" }, { status: viatorResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
