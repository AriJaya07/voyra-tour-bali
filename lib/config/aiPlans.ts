/**
 * AI subscription plans + top-up pack catalog.
 *
 * Snapshot of these values writes to AiSubscription on signup so legacy users
 * keep grandfathered terms when prices change here.
 */

export type AiPlanKey = "FREE" | "EXPLORER" | "VOYAGER" | "FOUNDER";
export type AiPackKey = "STARTER" | "STANDARD" | "BIG" | "MEGA";

export interface AiPlan {
  key: AiPlanKey;
  label: string;
  priceIdr: number;
  monthlyCredits: number;
  carryoverDays: number;
  carryoverCap: number;
  /** Feature flags read by aiCreditService.canUseFeature */
  features: {
    plan: boolean;
    planMaxDays: number;
    saveItineraries: number;
    concierge: boolean;
    dayOfTrip: boolean;
    cultural: boolean;
    voucherRead: boolean;
    familySeats: number;
    priorityRouting: boolean;
  };
}

export interface AiPack {
  key: AiPackKey;
  label: string;
  priceIdr: number;
  credits: number;
  /** TTL for granted credits, in days. */
  expiryDays: number;
}

export const AI_PLANS: Record<AiPlanKey, AiPlan> = {
  FREE: {
    key: "FREE",
    label: "Free",
    priceIdr: 0,
    monthlyCredits: 20,
    carryoverDays: 0,
    carryoverCap: 0,
    features: {
      plan: false,
      planMaxDays: 0,
      saveItineraries: 0,
      concierge: false,
      dayOfTrip: false,
      cultural: false,
      voucherRead: false,
      familySeats: 0,
      priorityRouting: false,
    },
  },
  EXPLORER: {
    key: "EXPLORER",
    label: "Explorer",
    priceIdr: 49_000,
    monthlyCredits: 300,
    carryoverDays: 30,
    carryoverCap: 600,
    features: {
      plan: true,
      planMaxDays: 7,
      saveItineraries: 5,
      concierge: false,
      dayOfTrip: false,
      cultural: true,
      voucherRead: false,
      familySeats: 0,
      priorityRouting: false,
    },
  },
  VOYAGER: {
    key: "VOYAGER",
    label: "Voyager",
    priceIdr: 129_000,
    monthlyCredits: 1_000,
    carryoverDays: 30,
    carryoverCap: 2_000,
    features: {
      plan: true,
      planMaxDays: 14,
      saveItineraries: 25,
      concierge: true,
      dayOfTrip: true,
      cultural: true,
      voucherRead: true,
      familySeats: 0,
      priorityRouting: false,
    },
  },
  FOUNDER: {
    key: "FOUNDER",
    label: "Founder",
    priceIdr: 299_000,
    monthlyCredits: 3_000,
    carryoverDays: 90,
    carryoverCap: 6_000,
    features: {
      plan: true,
      planMaxDays: 14,
      saveItineraries: 999,
      concierge: true,
      dayOfTrip: true,
      cultural: true,
      voucherRead: true,
      familySeats: 3,
      priorityRouting: true,
    },
  },
};

export const AI_PACKS: Record<AiPackKey, AiPack> = {
  STARTER: { key: "STARTER", label: "Starter", priceIdr: 25_000, credits: 120, expiryDays: 365 },
  STANDARD: { key: "STANDARD", label: "Standard", priceIdr: 79_000, credits: 500, expiryDays: 365 },
  BIG: { key: "BIG", label: "Big", priceIdr: 199_000, credits: 1_500, expiryDays: 365 },
  MEGA: { key: "MEGA", label: "Mega", priceIdr: 449_000, credits: 4_000, expiryDays: 365 },
};

/** Default TTL applied when granting subscription monthly credits. */
export function subscriptionGrantTtlDays(planKey: AiPlanKey): number {
  // Period is 30 days; carryover lets unused credits live carryoverDays beyond that.
  return 30 + AI_PLANS[planKey].carryoverDays;
}

/** Default TTL for promo / referral / loyalty grants. */
export const PROMO_GRANT_TTL_DAYS = 365;
export const LOYALTY_GRANT_TTL_DAYS = 90;

/** Backfill grant for legacy users on Phase 1 rollout. */
export const BACKFILL_GRANT_AMOUNT = 500;
export const BACKFILL_GRANT_TTL_DAYS = 365;
