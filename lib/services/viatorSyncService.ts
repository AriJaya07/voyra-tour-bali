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
