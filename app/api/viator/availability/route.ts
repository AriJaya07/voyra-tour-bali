import { NextResponse } from "next/server";
import {
  VIATOR_API_KEY,
  VIATOR_API_URL,
  VIATOR_HEADERS,
  VIATOR_MOCK_BOOKING,
  viatorSignal,
} from "@/lib/config/viator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productCode, productOptionCode, travelDate, paxMix, currency } =
      body;

    if (!productCode || !travelDate || !paxMix) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Mock mode: return fake availability so full flow can be tested ──
    if (!VIATOR_API_KEY || VIATOR_MOCK_BOOKING) {
      const totalPax = (paxMix as any[]).reduce(
        (sum: number, p: any) => sum + (p.numberOfTravelers || 1),
        0
      );
      const pricePerPax = 350000; // IDR mock price
      const mockSlots = [
        {
          productOptionCode: productOptionCode || "DEFAULT",
          startTime: "09:00",
          tourGradeCode: "TG1",
          available: true,
          totalPrice: pricePerPax * totalPax,
          partnerNetPrice: Math.round(pricePerPax * 0.8) * totalPax,
          currencyCode: currency || "IDR",
        },
        {
          productOptionCode: productOptionCode || "DEFAULT",
          startTime: "13:00",
          tourGradeCode: "TG1",
          available: true,
          totalPrice: pricePerPax * totalPax,
          partnerNetPrice: Math.round(pricePerPax * 0.8) * totalPax,
          currencyCode: currency || "IDR",
        },
      ];

      return NextResponse.json({
        available: true,
        productCode,
        productOptionCode,
        travelDate,
        slots: mockSlots,
        bookableItems: mockSlots.map((s) => ({
          productOptionCode: s.productOptionCode,
          startTime: s.startTime,
          tourGrade: { gradeCode: s.tourGradeCode },
          available: true,
          totalPrice: {
            price: {
              recommendedRetailPrice: s.totalPrice,
              partnerNetPrice: s.partnerNetPrice,
              currencyCode: s.currencyCode,
            },
          },
        })),
        _mock: true,
      });
    }

    // ── Real Viator API call ──
    const viatorPayload: Record<string, unknown> = {
      productCode,
      travelDate,
      paxMix,
      currency: currency || "USD",
    };
    if (productOptionCode) {
      viatorPayload.productOptionCode = productOptionCode;
    }

    const viatorResponse = await fetch(
      `${VIATOR_API_URL}/availability/check`,
      {
        method: "POST",
        headers: VIATOR_HEADERS,
        signal: viatorSignal(),
        body: JSON.stringify(viatorPayload),
      }
    );

    const data = await viatorResponse.json();

    // Parse and normalize the response for frontend consumption
    if (data.bookableItems && Array.isArray(data.bookableItems)) {
      const slots = data.bookableItems.map((item: any) => ({
        productOptionCode: item.productOptionCode || productOptionCode || "",
        startTime: item.startTime || null,
        tourGradeCode: item.tourGrade?.gradeCode || null,
        tourGradeTitle: item.tourGrade?.gradeTitle || null,
        available: item.available !== false,
        totalPrice:
          item.totalPrice?.price?.recommendedRetailPrice ||
          item.lineItems?.reduce(
            (sum: number, li: any) =>
              sum +
              (li.subtotalPrice?.price?.recommendedRetailPrice || 0),
            0
          ) ||
          0,
        partnerNetPrice:
          item.totalPrice?.price?.partnerNetPrice ||
          item.lineItems?.reduce(
            (sum: number, li: any) =>
              sum + (li.subtotalPrice?.price?.partnerNetPrice || 0),
            0
          ) ||
          0,
        currencyCode:
          item.totalPrice?.price?.currencyCode || currency || "USD",
        lineItems: item.lineItems?.map((li: any) => ({
          ageBand: li.ageBand,
          numberOfTravelers: li.numberOfTravelers,
          subtotalPrice:
            li.subtotalPrice?.price?.recommendedRetailPrice || 0,
        })),
      }));

      return NextResponse.json({
        ...data,
        available: slots.some((s: any) => s.available),
        slots,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
