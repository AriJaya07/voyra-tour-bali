/**
 * Feature flags — 2026-07 focus reset.
 *
 * The product's one job right now: browse → book → pay, no account needed.
 * Everything that distracts from that is flagged OFF (links hidden, pages kept
 * alive for direct URLs so nothing 404s). Flip a flag back on only after the
 * booking funnel has paying customers.
 *
 * See docs/growth-runbook.md for the strategy behind this.
 */
export const FEATURES = {
  /** AI subscription/credit selling: /ai/pricing + /ai/wallet links, upsell CTAs */
  aiMonetization: false,
  /** Loyalty tiers + rewards hub links */
  loyalty: false,
  /** Referral program surfaces */
  referral: false,
  /** Trip calendar / notes / saved-plans toolkit surfaces */
  tripToolkit: false,
  /** Notification bell + inbox */
  notificationsInbox: false,
  /** Exit-intent email capture modal (promised AI credits — off) */
  exitIntentModal: false,
  /** "Bali News" mobile-app promotion section on homepage */
  appPromotion: false,
  /** AI trip planner is free: no login wall, no credit charge (guest IP quota still applies) */
  freeAiPlanner: true,
} as const;
