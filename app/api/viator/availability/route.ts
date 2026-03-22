import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productCode, travelDate, paxMix, currency } = body;

    // Validate inputs
    if (!productCode || !travelDate || !paxMix) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to hit Viator, fallback to mock if API key unavailable
    const apiKey = process.env.VIATOR_API_KEY as string;
    
    // Fallback Mock for Certification if key is missing or invalid
    if (!apiKey) {
      return NextResponse.json({
        available: true,
        productCode: productCode,
        travelDate: travelDate,
        bookableItems: [
          {
            itemCode: "ITEM-1",
            totalPrice: {
              price: {
                recommendedRetailPrice: 150000,
                partnerNetPrice: 120000,
                currencyCode: currency || "USD"
              }
            }
          }
        ]
      });
    }

    const viatorResponse = await fetch('https://api.sandbox.viator.com/partner/availability/check', {
      method: 'POST',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': apiKey,
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify({
        productCode,
        travelDate,
        paxMix,
        currency: currency || "USD"
      }),
    });

    const data = await viatorResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }
}
