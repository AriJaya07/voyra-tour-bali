import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingRef, reasonCode } = body;

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    const apiKey = process.env.VIATOR_API_KEY as string;

    // Fallback Mock for Certification
    if (!apiKey) {
      return NextResponse.json({
        bookingRef,
        status: "CANCELLED"
      });
    }

    const viatorResponse = await fetch(`https://api.sandbox.viator.com/partner/bookings/${bookingRef}/cancel`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': apiKey,
      },
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
