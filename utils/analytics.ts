/**
 * Google Analytics 4 event helpers.
 * Safe to call even if GA isn't loaded — all methods check for window.gtag first.
 *
 * Spec: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(eventName: string, params?: GtagParams): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}

// ── Item helper (GA4 requires items as an array of objects) ───────────────

export interface GaItemInput {
  productCode: string;
  title: string;
  price: number;
  travelers?: number;
  category?: string;
}

interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
}

function mapItem(i: GaItemInput): GaItem {
  return {
    item_id: i.productCode,
    item_name: i.title,
    price: i.price,
    quantity: i.travelers ?? 1,
    ...(i.category ? { item_category: i.category } : {}),
  };
}

// ── Standard GA4 E-commerce Events ────────────────────────────────────────

/** User views a product detail page */
export function trackViewItem(item: GaItemInput & { currency: string }): void {
  gtag("view_item", {
    currency: item.currency,
    value: item.price,
    items: [mapItem(item)],
  });
}

/** User clicks a category tab */
export function trackCategoryClick(categoryName: string): void {
  gtag("select_content", {
    content_type: "category",
    content_id: categoryName,
  });
}

/** User starts the booking process (selects date + travelers) */
export function trackBeginCheckout(item: GaItemInput & { currency: string }): void {
  gtag("begin_checkout", {
    currency: item.currency,
    value: item.price * (item.travelers ?? 1),
    items: [mapItem(item)],
  });
}

/** Booking completed and confirmed PAID. Fire only after server confirmation. */
export function trackPurchase(item: GaItemInput & { transactionId: string; currency: string }): void {
  gtag("purchase", {
    transaction_id: item.transactionId,
    currency: item.currency,
    value: item.price * (item.travelers ?? 1),
    items: [mapItem(item)],
  });
}

/** Subscription / topup pack purchase confirmed. */
export function trackNonTourPurchase(p: {
  transactionId: string;
  sku: string;
  label: string;
  value: number;
  currency: string;
  category: "subscription" | "topup";
}): void {
  gtag("purchase", {
    transaction_id: p.transactionId,
    currency: p.currency,
    value: p.value,
    items: [
      {
        item_id: p.sku,
        item_name: p.label,
        item_category: p.category,
        price: p.value,
        quantity: 1,
      },
    ],
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────

export function trackSignUp(method: string = "email"): void {
  gtag("sign_up", { method });
}

export function trackLogin(method: string = "email"): void {
  gtag("login", { method });
}

// ── Search ────────────────────────────────────────────────────────────────

export function trackSearch(params: { query: string; resultCount: number; source: string }): void {
  gtag("view_search_results", {
    search_term: params.query,
    result_count: params.resultCount,
    search_source: params.source,
  });
}

// ── AI funnel ─────────────────────────────────────────────────────────────

export type AiFunnelStage =
  | "ai_plan_started"
  | "ai_plan_generated"
  | "ai_plan_refined"
  | "ai_itinerary_saved"
  | "ai_itinerary_shared"
  | "ai_concierge_asked"
  | "ai_voucher_uploaded"
  | "ai_family_seat_invited";

export function trackAi(stage: AiFunnelStage, params?: GtagParams): void {
  gtag(stage, params);
}

// ── Promo / affiliate ─────────────────────────────────────────────────────

export function trackPromotion(p: { name: string; slot: string; value?: number; currency?: string }): void {
  gtag("select_promotion", {
    promotion_id: p.slot,
    promotion_name: p.name,
    ...(p.value != null ? { value: p.value } : {}),
    ...(p.currency ? { currency: p.currency } : {}),
  });
}

export function trackAffiliateClick(p: { productCode: string; destination: string; partner: string }): void {
  gtag("affiliate_click", {
    item_id: p.productCode,
    destination_url: p.destination,
    partner: p.partner,
  });
}

// ── Generic escape hatch ──────────────────────────────────────────────────

export function trackEvent(eventName: string, params?: GtagParams): void {
  gtag(eventName, params);
}

// ── User identity (consent-gated) ─────────────────────────────────────────

/**
 * Set GA4 user_id for cross-device stitching. Caller is responsible for
 * hashing PII; GA4 accepts opaque strings. No-op if gtag missing.
 */
export function setGaUserId(measurementId: string, userId: string | null): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", measurementId, { user_id: userId ?? undefined });
}
