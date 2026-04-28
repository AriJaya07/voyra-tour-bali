/**
 * TourCMS payment uses the SAME Midtrans merchant as Viator/local bookings.
 * We isolate the TourCMS flow at the order_id level via a `TC-VOY-` prefix
 * so the dedicated TourCMS webhook ignores non-TC events and the existing
 * webhook can ignore TC events.
 *
 * In Midtrans MAP → Settings → Payment Notification URLs, add a SECOND URL
 * pointing at /api/tourcms/payment/notification. Midtrans then delivers
 * each event to both URLs; each handler filters by order_id prefix.
 */

import {
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_IS_PRODUCTION,
  MIDTRANS_SERVER_KEY,
  snap,
} from "@/lib/config/midtrans";

export const TOURCMS_MIDTRANS_SERVER_KEY = MIDTRANS_SERVER_KEY;
export const TOURCMS_MIDTRANS_CLIENT_KEY = MIDTRANS_CLIENT_KEY;
export const TOURCMS_MIDTRANS_IS_PRODUCTION = MIDTRANS_IS_PRODUCTION;

export const TOURCMS_MIDTRANS_SNAP_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

export const tourcmsSnap = snap;

export const TOURCMS_ORDER_PREFIX = "TC-VOY-";
