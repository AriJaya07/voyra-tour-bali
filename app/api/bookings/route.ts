import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

const BOOKING_HOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// GET /api/bookings — get current user's bookings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiryThreshold = new Date(Date.now() - BOOKING_HOLD_MS);
    // Delete expired unpaid bookings (24h hold):
    // 1. Non-mock PENDING with a Snap token (payment initiated but not completed)
    // 2. Mock PAYMENT bookings (Viator/local mock flow — admin set price but user didn't pay)
    await prisma.booking.deleteMany({
      where: {
        userId: parseInt(session.user.id),
        createdAt: { lt: expiryThreshold },
        OR: [
          { status: "PENDING", snapToken: { not: null } },
          { status: "PAYMENT", isMockMode: true },
        ],
      },
    });

    const bookings = await prisma.booking.findMany({
      where: { userId: parseInt(session.user.id) },
      include: {
        travelers: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // ====== REAL-TIME VIATOR STATUS SYNC ======
    // Grab bookings that are subject to change
    const activeBookings = bookings.filter(b => b.status === "PENDING" || b.status === "CONFIRMED");
    
    if (activeBookings.length > 0) {
      try {
        const refs = activeBookings.map(b => b.bookingRef);

        if (VIATOR_API_KEY) {
          const viatorRes = await fetch(`${VIATOR_API_URL}/bookings/status`, {
            method: "POST",
            headers: VIATOR_HEADERS,
            signal: viatorSignal(),
            body: JSON.stringify({ bookingRefs: refs }),
            cache: 'no-store'
          });

          if (viatorRes.ok) {
            const data = await viatorRes.json();
            const updates = [];

            for (const statusResult of data) {
              const existing = activeBookings.find(b => b.bookingRef === statusResult.bookingRef);
              // If status mutated on Viator side, save to our DB
              if (existing && existing.status !== statusResult.status) {
                existing.status = statusResult.status; // Update in-memory for fast API response
                updates.push(
                  prisma.booking.updateMany({
                    where: { bookingRef: statusResult.bookingRef },
                    data: { status: statusResult.status }
                  })
                );
              }
            }
            if (updates.length > 0) {
              await Promise.all(updates);
            }
          }
        }
      } catch (err) {
        console.error("Silent background sync failed", err);
      }
    }
    // ==========================================

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// PATCH /api/bookings - Update booking status
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (!body.bookingRef || !body.status) {
      return NextResponse.json({ error: "Missing body params" }, { status: 400 });
    }

    const updated = await prisma.booking.updateMany({
      where: { bookingRef: body.bookingRef },
      data: { status: body.status }
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
