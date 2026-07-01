/**
 * AI credit cost map.
 *
 * One credit ≈ 1,000 token-equivalents (~$0.001 at current Groq pricing).
 * Costs intentionally rounded up to absorb provider price drift.
 *
 * Update this file when:
 * - LLM provider pricing changes
 * - New AI endpoint added
 * - Token-budget per call changes (max_tokens, candidate count, etc.)
 */

export type AiEndpoint =
  | "chat"
  | "plan"
  | "plan_refine"
  | "search"
  | "concierge"
  | "day_of_trip"
  | "cultural"
  | "voucher_read"
  | "product_qa"
  | "trip_briefing"
  | "translate";

/** Upfront cost reserved before invoking the LLM. Settle exact after. */
export const AI_ENDPOINT_COST: Record<AiEndpoint, number> = {
  chat: 2,
  plan: 8,
  plan_refine: 6,
  search: 1,
  concierge: 4,
  day_of_trip: 3,
  cultural: 2,
  voucher_read: 5,
  product_qa: 2,
  trip_briefing: 3,
  translate: 2,
};

/** Variable surcharge for plan endpoint when days > 7. */
export function planCost(days: number): number {
  return days <= 7 ? AI_ENDPOINT_COST.plan : 12;
}

/** Settled cost calculator from token usage. Used for chat (variable output). */
export function settledChatCost(tokensIn: number, tokensOut: number): number {
  // 1 credit per ~1,000 tokens; min 1 to prevent free calls on cached responses
  const total = tokensIn + tokensOut;
  return Math.max(1, Math.ceil(total / 1000));
}

/** Hard ceiling for any single reservation — defensive guard. */
export const AI_MAX_RESERVATION = 50;

/** Guest free quota: 5 chat turns / IP / 24h rolling. */
export const AI_GUEST_DAILY_LIMIT = 5;

/** Window (ms) for guest quota counting. */
export const AI_GUEST_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Kill switch: when "off", guard always returns ok. Driven by env. */
export const AI_CREDIT_GUARD_ON =
  (process.env.AI_CREDIT_GUARD ?? "on").toLowerCase() !== "off";
