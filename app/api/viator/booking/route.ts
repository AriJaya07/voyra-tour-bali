import { NextResponse } from 'next/server';
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from '@/lib/config/viator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productCode, productOptionCode, travelDate, paxMix, bookerInfo, communication } = body;

    // Fallback Mock for Certification
    if (!VIATOR_API_KEY) {
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

    const viatorResponse = await fetch(`${VIATOR_API_URL}/bookings/book`, {
      method: 'POST',
      headers: VIATOR_HEADERS,
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
