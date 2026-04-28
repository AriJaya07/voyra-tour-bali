import { prisma } from "@/lib/prisma";
import {
  TOURCMS_COUNTRY_ISO,
  TOURCMS_DEFAULT_CHANNEL,
  TOURCMS_GEO_FILTER,
  TOURCMS_LOCATION_KEYWORDS,
  TOURCMS_MARKETPLACE_ID,
  TOURCMS_MOCK,
} from "@/lib/config/tourcms";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import type {
  TourcmsAvailabilityResult,
  TourcmsBookingOptions,
  TourcmsListResult,
  TourcmsListing,
  TourcmsPaxMixEntry,
  TourcmsProductDetail,
} from "@/types/tourcms";

const LIST_CACHE_MS = 60 * 60 * 1000;

function parseProductCode(code: string): { channelId: number; tourId: number } {
  const [c, t] = code.split(":");
  return { channelId: Number(c), tourId: Number(t) };
}

/**
 * Defense-in-depth filter: even if upstream returns non-Bali items
 * (e.g. operators with mixed catalog or wrong country tagging),
 * drop anything that does not match the configured Bali keywords.
 *
 * Set TOURCMS_GEO_FILTER=off to disable.
 */
function isBaliMatch(item: TourcmsListing): boolean {
  if (TOURCMS_GEO_FILTER === "off") return true;
  const haystack = [item.city, item.country, item.title, item.shortDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  if (
    TOURCMS_COUNTRY_ISO &&
    haystack.includes("indonesia")
  ) {
    return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
  }
  return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
}

function mockListing(idx: number, channelId: number): TourcmsListing {
  const tourId = 1000 + idx;
  return {
    productCode: `${channelId}:${tourId}`,
    channelId,
    tourId,
    title: `Sample TourCMS Tour ${idx + 1}`,
    slug: `${channelId}-${tourId}-sample-tour-${idx + 1}`,
    imageUrl: null,
    thumbnailUrl: null,
    shortDescription: "Discover Bali through our partner-curated tours.",
    fromPrice: 45 + idx * 10,
    currencyCode: "USD",
    durationText: `${4 + idx}h`,
    city: "Ubud",
    country: "Indonesia",
    rating: 4.5,
    reviewCount: 120 + idx * 5,
  };
}

export async function listProducts(opts: {
  q?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  channelId?: number;
}): Promise<TourcmsListResult> {
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 24;
  const channelId = opts.channelId ?? TOURCMS_MARKETPLACE_ID;

  if (TOURCMS_MOCK) {
    const items = Array.from({ length: pageSize }, (_, i) =>
      mockListing(i + (page - 1) * pageSize, channelId || TOURCMS_DEFAULT_CHANNEL)
    );
    return { items, total: 50, page, pageSize };
  }

  const cacheKey = `${channelId}:list:${opts.q || ""}:${opts.categoryId || ""}:${page}:${pageSize}`;
  const cached = await prisma.tourcmsProductCache.findUnique({
    where: { productCode: cacheKey },
  });
  if (cached && cached.expiresAt > new Date()) {
    return cached.payloadJson as unknown as TourcmsListResult;
  }

  const raw = await tourcmsClient.searchTours({
    q: opts.q,
    categoryId: opts.categoryId,
    page,
    pageSize,
    channelId,
  });

  const filteredItems = raw.items.filter(isBaliMatch);
  const dropped = raw.items.length - filteredItems.length;
  const result = {
    ...raw,
    items: filteredItems,
    total: Math.max(0, raw.total - dropped),
  };

  await prisma.tourcmsProductCache.upsert({
    where: { productCode: cacheKey },
    create: {
      productCode: cacheKey,
      channelId,
      tourId: 0,
      payloadJson: result as unknown as object,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + LIST_CACHE_MS),
    },
    update: {
      payloadJson: result as unknown as object,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + LIST_CACHE_MS),
    },
  });

  return result;
}

export async function getProduct(
  productCode: string
): Promise<TourcmsProductDetail | null> {
  const { channelId, tourId } = parseProductCode(productCode);
  if (!channelId || !tourId) return null;

  if (TOURCMS_MOCK) {
    const listing = mockListing(tourId - 1000, channelId);
    return {
      ...listing,
      description:
        "This is a mock TourCMS product description for development. Real upstream details will appear in production.",
      highlights: [
        "Hand-picked by our partner network",
        "Small group experience",
        "Pickup included from Ubud area",
      ],
      inclusions: ["Guide", "Transport", "Lunch"],
      exclusions: ["Personal expenses"],
      meetingPoint: "Voyra meeting point — Ubud Palace",
      images: [],
      ageBands: ["ADULT", "CHILD"],
    };
  }

  const product = await tourcmsClient.showTour({ channelId, tourId });
  if (!product) return null;
  if (!isBaliMatch(product)) return null;
  return product;
}

export async function getProductBySlug(
  slug: string
): Promise<TourcmsProductDetail | null> {
  const parts = slug.split("-");
  if (parts.length < 2) return null;
  const channelId = Number(parts[0]);
  const tourId = Number(parts[1]);
  if (!channelId || !tourId) return null;
  return getProduct(`${channelId}:${tourId}`);
}

export async function getAvailability(args: {
  productCode: string;
  travelDate: string;
  paxMix: TourcmsPaxMixEntry[];
}): Promise<TourcmsAvailabilityResult> {
  const { channelId, tourId } = parseProductCode(args.productCode);

  if (TOURCMS_MOCK) {
    const total = args.paxMix.reduce((s, p) => s + p.numberOfTravelers, 0) || 1;
    const ts = Date.now();
    return {
      available: true,
      productCode: args.productCode,
      travelDate: args.travelDate,
      currencyCode: "USD",
      slots: [
        {
          componentKey: `MOCK-CK-AM-${ts}`,
          rateId: "MOCK-RATE-1",
          startTime: "09:00",
          available: true,
          totalPrice: 45 * total,
          currencyCode: "USD",
          rateName: "Morning departure",
          spacesRemaining: 10,
        },
        {
          componentKey: `MOCK-CK-PM-${ts}`,
          rateId: "MOCK-RATE-1",
          startTime: "13:00",
          available: true,
          totalPrice: 45 * total,
          currencyCode: "USD",
          rateName: "Afternoon departure",
          spacesRemaining: 10,
        },
      ],
      _mock: true,
    };
  }

  return tourcmsClient.checkAvailability({
    channelId,
    tourId,
    date: args.travelDate,
    paxMix: args.paxMix,
  });
}

export async function resolveBookingOptions(args: {
  productCode: string;
  travelDate: string;
  paxMix: TourcmsPaxMixEntry[];
}): Promise<TourcmsBookingOptions> {
  const { channelId, tourId } = parseProductCode(args.productCode);

  if (TOURCMS_MOCK) {
    const avail = await getAvailability(args);
    return {
      productCode: args.productCode,
      travelDate: args.travelDate,
      options: avail.slots,
    };
  }

  return tourcmsClient.checkOptions({
    channelId,
    tourId,
    date: args.travelDate,
    paxMix: args.paxMix,
  });
}
