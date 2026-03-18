/**
 * Google Analytics 4 event helpers.
 * Safe to call even if GA isn't loaded — all methods check for window.gtag first.
 */

type GtagEvent = Record<string, string | number | boolean | undefined>

function gtag(...args: [string, string, GtagEvent?]) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  window.gtag(...args)
}

// Extend Window for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

// ── Standard GA4 E-commerce Events ─────────────────────────────────────

/** User views a product detail page */
export function trackViewItem(item: {
  productCode: string
  title: string
  price: number
  currency: string
}) {
  gtag("event", "view_item", {
    currency: item.currency,
    value: item.price,
    items: JSON.stringify([{
      item_id: item.productCode,
      item_name: item.title,
      price: item.price,
    }]),
  })
}

/** User clicks a category tab */
export function trackCategoryClick(categoryName: string) {
  gtag("event", "select_content", {
    content_type: "category",
    content_id: categoryName,
  })
}

/** User starts the booking process (selects date + travelers) */
export function trackBeginCheckout(item: {
  productCode: string
  title: string
  price: number
  currency: string
  travelers: number
}) {
  gtag("event", "begin_checkout", {
    currency: item.currency,
    value: item.price,
    items: JSON.stringify([{
      item_id: item.productCode,
      item_name: item.title,
      price: item.price,
      quantity: item.travelers,
    }]),
  })
}

/** Booking completed successfully */
export function trackPurchase(item: {
  transactionId: string
  productCode: string
  title: string
  price: number
  currency: string
  travelers: number
}) {
  gtag("event", "purchase", {
    transaction_id: item.transactionId,
    currency: item.currency,
    value: item.price,
    items: JSON.stringify([{
      item_id: item.productCode,
      item_name: item.title,
      price: item.price,
      quantity: item.travelers,
    }]),
  })
}

/** Generic event for custom tracking */
export function trackEvent(eventName: string, params?: GtagEvent) {
  gtag("event", eventName, params)
}
