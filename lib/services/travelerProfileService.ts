/**
 * Traveler DNA (F3) — the personalization spine.
 *
 * One place that fuses every signal we already capture about a user
 * (UserPreferences + wishlist + recently-viewed + loyalty tier) into a single
 * reusable profile object. Consumed by the "For You" feed today, and designed
 * to feed planner defaults, briefings, and notifications later.
 *
 * Pure derivation over existing rows — no new heavy schema, no LLM cost.
 */

import { prisma } from "@/lib/prisma";

export type BudgetBand = "budget" | "moderate" | "luxury";

export interface TravelerProfile {
  userId: number;
  /** Explicit interest tags from the travel profile (e.g. "adventure", "culture"). */
  styleTags: string[];
  /** Preferred region, lowercased (e.g. "ubud"). */
  regionPref: string | null;
  /** Party composition. */
  paxProfile: {
    adults: number;
    children: number;
    seniors: number;
    infants: number;
    hasKids: boolean;
    hasSeniors: boolean;
  };
  /** Rough budget band derived from loyalty tier + party (no explicit budget field exists). */
  budgetBand: BudgetBand;
  /** Loyalty tier if any: BRONZE | SILVER | GOLD. */
  loyaltyTier: string | null;
  /**
   * Weighted keyword bag used for text-similarity ranking of the catalog.
   * Higher weight = stronger signal. Keys are lowercase single words.
   */
  interestWeights: Record<string, number>;
  /** Titles of tours the user saved or recently viewed — for "because you liked X". */
  affinityTitles: string[];
  /** True when we have at least one real personalization signal. */
  hasSignal: boolean;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "your", "you", "our", "this", "that",
  "tour", "tours", "bali", "trip", "day", "days", "experience", "experiences",
  "private", "group", "half", "full", "best", "top", "all", "one", "two",
  "get", "see", "visit", "explore", "adventure", "activity", "activities",
]);

/** Split free text into meaningful lowercase word tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function addWeight(bag: Record<string, number>, word: string, weight: number) {
  const w = word.toLowerCase().trim();
  if (!w || w.length < 3) return;
  bag[w] = (bag[w] ?? 0) + weight;
}

/**
 * Derive a Traveler DNA profile for a user. Safe on missing data — a brand-new
 * user returns a valid profile with hasSignal=false.
 */
export async function getTravelerProfile(userId: number): Promise<TravelerProfile> {
  const [prefs, wishlist, recent, loyalty] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      take: 12,
      select: { title: true },
    }),
    prisma.recentlyViewedItem.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: 12,
      select: { title: true },
    }),
    prisma.loyaltyAccount.findUnique({
      where: { userId },
      select: { tier: true },
    }),
  ]);

  const styleTags = (prefs?.styleTags ?? []).map((t) => t.toLowerCase());
  const regionPref = prefs?.regionPref ? prefs.regionPref.toLowerCase().trim() : null;

  const affinityTitles = [
    ...wishlist.map((w) => w.title),
    ...recent.map((r) => r.title),
  ].filter(Boolean);

  // Build the weighted interest bag. Explicit signals weigh most.
  const interestWeights: Record<string, number> = {};
  for (const tag of styleTags) {
    // A style tag can be multi-word ("water sports") — weight each token.
    for (const tok of tokenize(tag)) addWeight(interestWeights, tok, 5);
    addWeight(interestWeights, tag, 5);
  }
  if (regionPref) {
    for (const tok of tokenize(regionPref)) addWeight(interestWeights, tok, 6);
  }
  // Wishlist is a stronger intent signal than recently-viewed.
  for (const w of wishlist) for (const tok of tokenize(w.title)) addWeight(interestWeights, tok, 3);
  for (const r of recent) for (const tok of tokenize(r.title)) addWeight(interestWeights, tok, 1.5);

  const adults = prefs?.partyAdults ?? 0;
  const children = prefs?.partyChildren ?? 0;
  const seniors = prefs?.partySeniors ?? 0;
  const infants = prefs?.partyInfants ?? 0;

  const tier = loyalty?.tier ?? null;
  const budgetBand: BudgetBand = tier === "GOLD" ? "luxury" : tier === "SILVER" ? "moderate" : "moderate";

  const hasSignal =
    styleTags.length > 0 ||
    !!regionPref ||
    affinityTitles.length > 0 ||
    children > 0 ||
    seniors > 0;

  return {
    userId,
    styleTags,
    regionPref,
    paxProfile: {
      adults,
      children,
      seniors,
      infants,
      hasKids: children > 0 || infants > 0,
      hasSeniors: seniors > 0,
    },
    budgetBand,
    loyaltyTier: tier,
    interestWeights,
    affinityTitles,
    hasSignal,
  };
}
