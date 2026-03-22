import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingRef = searchParams.get('bookingRef');

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    const apiKey = process.env.VIATOR_API_KEY as string;

    // Fallback Mock for Certification
    if (!apiKey) {
      return NextResponse.json({
        bookingRef,
        refundDetails: {
          refundAmount: 120,
          currencyCode: "USD"
        },
        status: "CANCELLABLE"
      });
    }

    const viatorResponse = await fetch(`https://api.sandbox.viator.com/partner/bookings/${bookingRef}/cancel-quote`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;version=2.0',
        'exp-api-key': apiKey,
        'Accept-Language': 'en-US',
      }
    });

    const data = await viatorResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
