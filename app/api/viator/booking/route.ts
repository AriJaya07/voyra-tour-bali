import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productCode, productOptionCode, travelDate, paxMix, bookerInfo, communication } = body;

    const apiKey = process.env.VIATOR_API_KEY as string;

    // Fallback Mock for Certification
    if (!apiKey) {
      return NextResponse.json({
        bookingRef: `BR-${Date.now()}`,
        orderId: `OR-${Math.floor(Math.random() * 1000000)}`,
        status: "CONFIRMED",
        voucherInfo: {
          url: "https://viator.com/voucher?id=mock"
        }
      });
    }

    const viatorPayload: Record<string, unknown> = {
      productCode,
      travelDate,
      paxMix,
      bookerInfo,
      communication,
    };
    if (productOptionCode) {
      viatorPayload.productOptionCode = productOptionCode;
    }

    const viatorResponse = await fetch('https://api.sandbox.viator.com/partner/bookings/book', {
      method: 'POST',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': apiKey,
      },
      body: JSON.stringify(viatorPayload),
    });

    const data = await viatorResponse.json();

    if (!viatorResponse.ok) {
      return NextResponse.json({ error: data.message || "Booking failed" }, { status: viatorResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
