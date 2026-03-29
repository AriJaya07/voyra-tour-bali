import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

/**
 * GET /api/viator/schedules?productCode=XXX&currency=USD
 *
 * Fetches availability schedules for a product.
 * Used to pre-load which dates are available on the booking calendar.
 */
export async function GET(req: NextRequest) {
  try {
    const productCode = req.nextUrl.searchParams.get("productCode");
    const currency = req.nextUrl.searchParams.get("currency") || "USD";

    if (!productCode) {
      return NextResponse.json({ error: "Missing productCode" }, { status: 400 });
    }

    if (!VIATOR_API_KEY) {
      // Mock: next 30 days are available
      const dates: string[] = [];
      const today = new Date();
      for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
      return NextResponse.json({
        productCode,
        currency,
        availableDates: dates,
        unavailableDates: [],
      });
    }

    const res = await fetch(
      `${VIATOR_API_URL}/availability/schedules/${productCode}`,
      {
        headers: { ...VIATOR_HEADERS, "Accept-Currency": currency },
        signal: viatorSignal(),
        next: { revalidate: 21600 }, // Cache 6 hours
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch schedules" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Extract available date ranges into a flat list
    const availableDates: string[] = [];
    const unavailableDates: string[] = [];

    for (const schedule of data.bookableItems || data.schedules || []) {
      const seasons = schedule.seasons || [];
      for (const season of seasons) {
        if (season.startDate && season.endDate) {
          // Season has a date range — mark as available period
          availableDates.push(season.startDate);
        }
        // Blackout dates
        for (const blackout of season.pricingRecords || []) {
          if (blackout.timedEntries) {
            for (const entry of blackout.timedEntries) {
              if (entry.unavailableDates) {
                unavailableDates.push(...entry.unavailableDates);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      productCode,
      currency,
      availableDates,
      unavailableDates,
      rawSchedules: data.bookableItems || data.schedules || [],
    });
  } catch (error) {
    console.error("Schedules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
