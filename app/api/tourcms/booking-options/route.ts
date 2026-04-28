import { NextRequest, NextResponse } from "next/server";

import { resolveBookingOptions } from "@/lib/services/tourcmsService";
import { TourcmsApiError, type TourcmsPaxMixEntry } from "@/types/tourcms";

interface OptionsBody {
  productCode?: string;
  travelDate?: string;
  paxMix?: TourcmsPaxMixEntry[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OptionsBody;
    const { productCode, travelDate, paxMix } = body;
    if (!productCode || !travelDate || !Array.isArray(paxMix) || paxMix.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const result = await resolveBookingOptions({ productCode, travelDate, paxMix });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("TourCMS booking-options error:", msg);
    if (error instanceof TourcmsApiError) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Failed to resolve options" },
      { status: 500 }
    );
  }
}
