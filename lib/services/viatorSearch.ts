import {
  VIATOR_API_KEY,
  VIATOR_API_URL,
  VIATOR_HEADERS,
  VIATOR_TIMEOUT_MS,
} from "@/lib/config/viator";

const BALI_DESTINATION_ID = 98;
const SEARCH_CACHE_TTL = 60 * 1000;

export interface ViatorProductImage {
  isCover?: boolean;
  variants?: { url: string; width: number; height: number }[];
}

export interface ViatorProductSummary {
  productCode?: string;
  title?: string;
  description?: string;
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
  reviews?: { totalReviews?: number; combinedAverageRating?: number };
  duration?: { fixedDurationInMinutes?: number };
  images?: ViatorProductImage[];
  tags?: number[];
  flags?: string[];
}

export interface ViatorSearchResult {
  products: ViatorProductSummary[];
  totalCount: number;
  page: number;
  count: number;
  hasMore: boolean;
  warning?: string;
  source: "freetext" | "products" | "empty" | "cache";
}

interface CacheEntry {
  body: ViatorSearchResult;
  expires: number;
}

const searchCache = new Map<string, CacheEntry>();

interface SearchOpts {
  query: string;
  currency?: string;
  page?: number;
  count?: number;
  signal?: AbortSignal;
}

/**
 * Server-side Viator product search. Single source of truth for both the
 * `/api/viator?action=search` proxy and any internal AI route that needs a
 * candidate pool. Tries `/search/freetext` first; falls back to the catalog
 * `/products/search` when the API key lacks freetext scope (403 / 404).
 *
 * Memoised in-process for 60s per (query, currency, page, count) tuple.
 */
export async function searchViatorProducts(opts: SearchOpts): Promise<ViatorSearchResult> {
  const query = opts.query.trim();
  const currency = opts.currency || "USD";
  const page = Math.max(1, opts.page ?? 1);
  const count = Math.min(50, Math.max(1, opts.count ?? 20));

  if (!query) {
    return { products: [], totalCount: 0, page, count, hasMore: false, source: "empty" };
  }
  if (!VIATOR_API_KEY) {
    return { products: [], totalCount: 0, page, count, hasMore: false, source: "empty" };
  }

  const cacheKey = `search|${query.toLowerCase()}|${currency}|${page}|${count}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { ...cached.body, source: "cache" };
  }

  const start = (page - 1) * count + 1;

  try {
    const res = await fetch(`${VIATOR_API_URL}/search/freetext`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      body: JSON.stringify({
        searchTerm: query,
        currency,
        productFiltering: { destination: String(BALI_DESTINATION_ID) },
        searchTypes: [{ searchType: "PRODUCTS", pagination: { start, count } }],
      }),
      signal: opts.signal ?? AbortSignal.timeout(VIATOR_TIMEOUT_MS),
    });

    if (res.ok) {
      const data = await res.json();
      const block = data?.products ?? {};
      const rawResults: Array<Record<string, unknown>> = block.results ?? [];
      const totalCount = typeof block.totalCount === "number" ? block.totalCount : rawResults.length;
      const products = rawResults.map(
        (r) => ((r.productSummary as ViatorProductSummary) ?? r) as ViatorProductSummary
      );
      const body: ViatorSearchResult = {
        products,
        totalCount,
        page,
        count,
        hasMore: start + count - 1 < totalCount,
        source: "freetext",
      };
      searchCache.set(cacheKey, { body, expires: Date.now() + SEARCH_CACHE_TTL });
      return body;
    }

    if (res.status === 403 || res.status === 404) {
      return await fallbackProductsSearch(query, currency, page, count, start, cacheKey, opts.signal);
    }

    console.error(`[viatorSearch] freetext non-OK status=${res.status} q="${query}"`);
    return { products: [], totalCount: 0, page, count, hasMore: false, source: "empty" };
  } catch (err) {
    console.error(
      "[viatorSearch] freetext threw",
      err instanceof Error ? err.message : "unknown",
      `q="${query}"`
    );
    try {
      return await fallbackProductsSearch(query, currency, page, count, start, cacheKey, opts.signal);
    } catch {
      return { products: [], totalCount: 0, page, count, hasMore: false, source: "empty" };
    }
  }
}

async function fallbackProductsSearch(
  query: string,
  currency: string,
  page: number,
  count: number,
  start: number,
  cacheKey: string,
  signal?: AbortSignal
): Promise<ViatorSearchResult> {
  const res = await fetch(`${VIATOR_API_URL}/products/search`, {
    method: "POST",
    headers: { ...VIATOR_HEADERS, "Accept-Currency": currency },
    body: JSON.stringify({
      filtering: { destination: BALI_DESTINATION_ID },
      searchTerm: query,
      currency,
      sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
      pagination: { start, count },
    }),
    signal: signal ?? AbortSignal.timeout(VIATOR_TIMEOUT_MS),
  });
  if (!res.ok) {
    return { products: [], totalCount: 0, page, count, hasMore: false, source: "empty" };
  }
  const data = await res.json();
  const products = (Array.isArray(data?.products) ? data.products : []) as ViatorProductSummary[];
  const totalCount =
    typeof data?.totalCount === "number" ? data.totalCount : products.length;
  const body: ViatorSearchResult = {
    products,
    totalCount,
    page,
    count,
    hasMore: start + count - 1 < totalCount,
    warning: "Free-text search unavailable on this API key — showing top Bali tours.",
    source: "products",
  };
  searchCache.set(cacheKey, { body, expires: Date.now() + SEARCH_CACHE_TTL });
  return body;
}
