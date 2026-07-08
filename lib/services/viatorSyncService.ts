import axios from "axios";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

/**
 * Fetch products modified since a given timestamp.
 * Used by the cron job to keep local product cache fresh.
 *
 * Returns an array of modified product codes.
 */
export async function fetchModifiedProducts(
  modifiedSince: string
): Promise<string[]> {
  if (!VIATOR_API_KEY) return [];

  try {
    const res = await axios.get(
      `${VIATOR_API_URL}/products/modified-since`,
      {
        params: { modifiedSince },
        headers: VIATOR_HEADERS,
        timeout: 120000,
      }
    );

    return res.data?.products || res.data?.productCodes || [];
  } catch (error) {
    console.error("[ViatorSync] Failed to fetch modified products:", error);
    return [];
  }
}

/**
 * Fetch bookings modified since a given timestamp.
 * Returns an array of booking references that changed.
 */
export async function fetchModifiedBookings(
  modifiedSince: string
): Promise<string[]> {
  if (!VIATOR_API_KEY) return [];

  try {
    const res = await axios.get(
      `${VIATOR_API_URL}/bookings/modified-since`,
      {
        params: { modifiedSince },
        headers: VIATOR_HEADERS,
        timeout: 120000,
      }
    );

    return res.data?.bookingRefs || [];
  } catch (error) {
    console.error("[ViatorSync] Failed to fetch modified bookings:", error);
    return [];
  }
}

/**
 * Acknowledge processed booking modifications.
 * This tells Viator we've handled these updates so they
 * won't appear in future /modified-since calls.
 */
export async function acknowledgeBookingModifications(
  bookingRefs: string[]
): Promise<boolean> {
  if (!VIATOR_API_KEY || bookingRefs.length === 0) return true;

  try {
    await axios.post(
      `${VIATOR_API_URL}/bookings/modified-since/acknowledge`,
      { bookingRefs },
      {
        headers: VIATOR_HEADERS,
        timeout: 120000,
      }
    );
    return true;
  } catch (error) {
    console.error("[ViatorSync] Failed to acknowledge modifications:", error);
    return false;
  }
}

/**
 * Fetch the current status for a list of booking references.
 */
export async function fetchBookingStatuses(
  bookingRefs: string[]
): Promise<Array<{ bookingRef: string; status: string }>> {
  if (!VIATOR_API_KEY || bookingRefs.length === 0) return [];

  try {
    const res = await axios.post(
      `${VIATOR_API_URL}/bookings/status`,
      { bookingRefs },
      {
        headers: VIATOR_HEADERS,
        timeout: 120000,
      }
    );

    return res.data?.statuses || res.data || [];
  } catch (error) {
    console.error("[ViatorSync] Failed to fetch booking statuses:", error);
    return [];
  }
}

/**
 * Fetch all product tags from Viator.
 * Used by daily cron to keep category mappings fresh.
 */
export async function fetchProductTags(): Promise<
  Array<{ tagId: number; name: string; parentTagIds?: number[] }>
> {
  if (!VIATOR_API_KEY) return [];

  try {
    const res = await axios.get(`${VIATOR_API_URL}/products/tags`, {
      headers: VIATOR_HEADERS,
      timeout: 120000,
    });

    return res.data?.tags || [];
  } catch (error) {
    console.error("[ViatorSync] Failed to fetch product tags:", error);
    return [];
  }
}

/**
 * Fetch locations in bulk from Viator.
 * Used by daily cron to keep pickup/meeting point data fresh.
 */
export async function fetchLocationsBulk(
  refs: string[]
): Promise<Array<{ ref: string; name: string; address: string | null }>> {
  if (!VIATOR_API_KEY || refs.length === 0) return [];

  const MAX_BATCH = 500;
  const allLocations: Array<{ ref: string; name: string; address: string | null }> = [];

  for (let i = 0; i < refs.length; i += MAX_BATCH) {
    const chunk = refs.slice(i, i + MAX_BATCH);
    try {
      const res = await axios.post(
        `${VIATOR_API_URL}/locations/bulk`,
        { locations: chunk },
        { headers: VIATOR_HEADERS, timeout: 120000 }
      );
      const raw = res.data?.locations || [];
      allLocations.push(
        ...raw.map((loc: Record<string, unknown>, idx: number) => ({
          ref: (loc.ref as string) || chunk[idx],
          name: (loc.name as string) || "",
          address: typeof loc.address === "string" ? loc.address : null,
        }))
      );
    } catch (error) {
      console.error(`[ViatorSync] Locations batch error (${chunk.length} refs):`, error);
    }
  }

  return allLocations;
}

/**
 * Fetch reviews for a list of product codes.
 * Used by daily cron to keep review data fresh.
 */
export async function fetchProductReviews(
  productCode: string
): Promise<{ totalCount: number; averageRating: number | null }> {
  if (!VIATOR_API_KEY) return { totalCount: 0, averageRating: null };

  try {
    const res = await axios.post(
      `${VIATOR_API_URL}/reviews/product`,
      {
        productCode,
        pagination: { start: 1, count: 1 },
        sorting: { sort: "MOST_RECENT" },
      },
      { headers: VIATOR_HEADERS, timeout: 120000 }
    );

    return {
      totalCount: res.data?.totalCount || 0,
      averageRating: res.data?.rating || null,
    };
  } catch (error) {
    console.error(`[ViatorSync] Failed to fetch reviews for ${productCode}:`, error);
    return { totalCount: 0, averageRating: null };
  }
}

export interface ViatorReviewItem {
  rating: number;
  title: string | null;
  text: string | null;
  userName: string | null;
  publishedDate: string | null;
}

/**
 * Fetch full review content for one product — rating summary + recent review
 * texts. Used by the public reviews endpoint to show social proof at checkout.
 */
export async function fetchProductReviewsFull(
  productCode: string,
  count = 5
): Promise<{ totalCount: number; averageRating: number | null; reviews: ViatorReviewItem[] }> {
  if (!VIATOR_API_KEY) return { totalCount: 0, averageRating: null, reviews: [] };

  try {
    const res = await axios.post(
      `${VIATOR_API_URL}/reviews/product`,
      {
        productCode,
        pagination: { start: 1, count: Math.min(Math.max(count, 1), 20) },
        sorting: { sort: "MOST_RECENT_PER_LOCALE" },
        provider: "ALL",
        showMachineTranslated: true,
      },
      { headers: VIATOR_HEADERS, timeout: 120000 }
    );

    const reviews: ViatorReviewItem[] = (res.data?.reviews || []).map(
      (r: Record<string, unknown>) => ({
        rating: Number(r.rating) || 0,
        title: typeof r.title === "string" ? r.title : null,
        text: typeof r.text === "string" ? r.text : null,
        userName: typeof r.userName === "string" ? r.userName : null,
        publishedDate: typeof r.publishedDate === "string" ? r.publishedDate : null,
      })
    );

    return {
      totalCount: res.data?.totalCount || 0,
      averageRating: res.data?.rating || null,
      reviews,
    };
  } catch (error) {
    console.error(
      `[ViatorSync] Failed to fetch full reviews for ${productCode}:`,
      error instanceof Error ? error.message : "Unknown"
    );
    return { totalCount: 0, averageRating: null, reviews: [] };
  }
}
