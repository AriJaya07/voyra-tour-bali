import { prisma } from "@/lib/prisma";
import {
  TOURCMS_COUNTRY_ISO,
  TOURCMS_GEO_FILTER,
  TOURCMS_LISTING_CHANNEL,
  TOURCMS_LOCATION_KEYWORDS,
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
  if (TOURCMS_COUNTRY_ISO && haystack.includes("indonesia")) {
    return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
  }
  return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
}

function buildListCacheKey(opts: {
  channelId: number;
  q?: string;
  categoryId?: number;
  page: number;
  pageSize: number;
}): string {
  return `${opts.channelId}:list:${opts.q || ""}:${opts.categoryId || ""}:${opts.page}:${opts.pageSize}`;
}

async function readListCache(key: string): Promise<TourcmsListResult | null> {
  const row = await prisma.tourcmsProductCache.findUnique({
    where: { productCode: key },
  });
  if (!row || row.expiresAt <= new Date()) return null;
  const payload = row.payloadJson as unknown as TourcmsListResult;
  return payload.items?.length ? payload : null;
}

async function writeListCache(
  key: string,
  channelId: number,
  payload: TourcmsListResult
): Promise<void> {
  if (!payload.items?.length) return;
  await prisma.tourcmsProductCache.upsert({
    where: { productCode: key },
    create: {
      productCode: key,
      channelId,
      tourId: 0,
      payloadJson: payload as unknown as object,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + LIST_CACHE_MS),
    },
    update: {
      payloadJson: payload as unknown as object,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + LIST_CACHE_MS),
    },
  });
}

export async function listProducts(opts: {
  q?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  channelId?: number;
  noCache?: boolean;
}): Promise<TourcmsListResult> {
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 24;
  const channelId = opts.channelId ?? TOURCMS_LISTING_CHANNEL;

  const cacheKey = buildListCacheKey({
    channelId,
    q: opts.q,
    categoryId: opts.categoryId,
    page,
    pageSize,
  });

  if (!opts.noCache) {
    const cached = await readListCache(cacheKey);
    if (cached) return cached;
  }

  const raw = await tourcmsClient.searchTours({
    q: opts.q,
    categoryId: opts.categoryId,
    page,
    pageSize,
    channelId,
  });

  console.log(
    `[TourCMS] upstream returned ${raw.items.length}/${raw.total} (filter=${TOURCMS_GEO_FILTER})`
  );

  const filteredItems = raw.items.filter(isBaliMatch);
  const dropped = raw.items.length - filteredItems.length;
  if (dropped > 0) {
    console.log(`[TourCMS] post-filter dropped ${dropped} non-Bali items`);
  }

  const result: TourcmsListResult = {
    ...raw,
    items: filteredItems,
    total: Math.max(0, raw.total - dropped),
  };

  await writeListCache(cacheKey, channelId, result);

  return result;
}

export async function getProduct(
  productCode: string
): Promise<TourcmsProductDetail | null> {
  const { channelId, tourId } = parseProductCode(productCode);
  if (!channelId || !tourId) return null;

  const product = await tourcmsClient.showTour({ channelId, tourId });
  if (!product) return null;

  // Detail pages trust the slug — user already navigated here.
  // Listing-side filter still scopes the catalog to Bali.
  if (!isBaliMatch(product)) {
    console.warn(
      `[TourCMS] detail ${productCode} not Bali (city=${product.city ?? "?"}, country=${product.country ?? "?"}) — serving anyway`
    );
  }
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
  return tourcmsClient.checkOptions({
    channelId,
    tourId,
    date: args.travelDate,
    paxMix: args.paxMix,
  });
}
