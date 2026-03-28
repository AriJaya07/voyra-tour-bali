import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

export async function GET(request: Request) {
  // Check Vercel Cron Secret (Optional but recommended in production)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!VIATOR_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // Look back 2 hours for modifications (covers 30 min cron intervals safely)
    const modifiedSince = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    console.log(`[VIATOR CRON] Checking modifications since ${modifiedSince}`);

    // Step 1: Find which bookings were modified
    const modifiedRes = await fetch(`${VIATOR_API_URL}/bookings/modified-since?modifiedSince=${modifiedSince}`, {
      headers: VIATOR_HEADERS,
    });

    if (!modifiedRes.ok) {
      return NextResponse.json({ error: "Viator API returned an error" }, { status: modifiedRes.status });
    }

    const modifiedData = await modifiedRes.json();
    const refs = modifiedData.bookingRefs || [];

    console.log(`[VIATOR CRON] Found ${refs.length} modified bookings.`);

    // Step 2: Fetch the exact new status for these modified bookings
    if (refs.length > 0) {
      const statusRes = await fetch(`${VIATOR_API_URL}/bookings/status`, {
        method: "POST",
        headers: VIATOR_HEADERS,
        body: JSON.stringify({ bookingRefs: refs })
      });
      
      if (statusRes.ok) {
         const statuses = await statusRes.json(); // Array of { bookingRef, status }
         
         const updates = statuses.map((s: any) => 
           prisma.booking.updateMany({
             where: { bookingRef: s.bookingRef },
             data: { status: s.status }
           })
         );
         
         await Promise.all(updates);
         console.log(`[VIATOR CRON] Successfully updated ${updates.length} records in DB.`);
      }
    }

    return NextResponse.json({ success: true, syncedCount: refs.length });
  } catch (error: any) {
    console.error("[VIATOR CRON] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
