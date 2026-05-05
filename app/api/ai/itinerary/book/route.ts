import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { buildViatorProductUrl } from "@/lib/config/viator";

/**
 * POST /api/ai/itinerary/book  Body: { itineraryId, dayFilter?: number }
 *
 * Open to any signed-in user with a saved AI itinerary: turn it into a
 * one-click checklist of bookable items, each with a 5% promo applied
 * (BUNDLE5) and an affiliate-tracked Viator deep-link. Also writes
 * ImportedTrip rows so the user's profile/itineraries page picks them up
 * automatically.
 *
 * Costs 0 credits — the whole point is to drive Viator commission.
 */

type ItineraryItem = {
  day?: number;
  slot?: string;
  productCode?: string | null;
  title?: string;
  source?: string;
  href?: string | null;
  notes?: string;
  price?: number | null;
};

const PROMO_CODE = "BUNDLE5";
const PROMO_DISCOUNT = 0.05;

function appendPromo(href: string): string {
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}promo=${PROMO_CODE}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const itineraryId = Number(body?.itineraryId);
    const dayFilter = body?.dayFilter != null ? Number(body.dayFilter) : null;
    if (!Number.isFinite(itineraryId) || itineraryId <= 0) {
      return NextResponse.json({ error: "Invalid itineraryId" }, { status: 400 });
    }

    const itin = await prisma.savedItinerary.findFirst({
      where: { id: itineraryId, userId },
    });
    if (!itin) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    const items = Array.isArray(itin.itemsJson) ? (itin.itemsJson as ItineraryItem[]) : [];
    const filtered = items.filter((it) => {
      if (!it.productCode || it.source !== "viator") return false;
      if (dayFilter != null && it.day !== dayFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: "No bookable Viator items in this itinerary." },
        { status: 400 }
      );
    }

    // Compute totals + build links
    const bundle = filtered.map((it) => {
      const baseHref = it.productCode
        ? buildViatorProductUrl(it.productCode, it.title ?? null)
        : null;
      const href = baseHref ? appendPromo(baseHref) : null;
      const originalPrice = typeof it.price === "number" ? it.price : null;
      const discountedPrice =
        originalPrice != null ? Math.round(originalPrice * (1 - PROMO_DISCOUNT) * 100) / 100 : null;
      return {
        day: it.day,
        slot: it.slot,
        productCode: it.productCode!,
        title: it.title ?? "Tour",
        href,
        originalPrice,
        discountedPrice,
        notes: it.notes ?? "",
      };
    });

    const totalsUsd = bundle.reduce((acc, b) => acc + (b.originalPrice ?? 0), 0);
    const totalsAfterPromo = bundle.reduce((acc, b) => acc + (b.discountedPrice ?? 0), 0);

    // Mirror to ImportedTrip so /trips picks them up. Idempotent
    // by (userId, externalRef): skip duplicates silently.
    const fromDate = itin.fromDate ?? null;
    for (const b of bundle) {
      const externalRef = `${itin.id}-${b.productCode}`;
      const exists = await prisma.importedTrip.findFirst({
        where: { userId, externalRef },
        select: { id: true },
      });
      if (exists) continue;

      const dayOffset = (b.day ?? 1) - 1;
      const travelDate =
        fromDate != null ? new Date(fromDate.getTime() + dayOffset * 86_400_000) : null;
      await prisma.importedTrip
        .create({
          data: {
            userId,
            source: "viator",
            externalRef,
            productTitle: b.title,
            travelDate,
            href: b.href,
            notes: `From itinerary "${itin.title}" — day ${b.day}, ${b.slot}. Promo ${PROMO_CODE} applied.`,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      itineraryId: itin.id,
      title: itin.title,
      promoCode: PROMO_CODE,
      promoDiscount: PROMO_DISCOUNT,
      bundle,
      totals: {
        currency: "USD",
        original: Math.round(totalsUsd * 100) / 100,
        afterPromo: Math.round(totalsAfterPromo * 100) / 100,
        savings: Math.round((totalsUsd - totalsAfterPromo) * 100) / 100,
      },
      itemsCount: bundle.length,
    });
  } catch (error) {
    console.error("[ai/itinerary/book]", error);
    return NextResponse.json({ error: "Bundle booking failed" }, { status: 500 });
  }
}
