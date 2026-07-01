/**
 * Recommendation service (Feature 3) — ranks the Voyra catalog for one user.
 *
 * Deterministic, zero-cost ranking over the DB catalog using the Traveler DNA
 * profile. No LLM call on the hot path (a homepage rail hits this on every load,
 * so rationale is templated, not generated) — grounded, cheap, and fast.
 */

import { prisma } from "@/lib/prisma";
import { getTravelerProfile, type TravelerProfile } from "@/lib/services/travelerProfileService";

export interface RecommendedItem {
  id: string; // "db-{id}"
  source: "db";
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: "IDR";
  slug: string;
  categoryId: number | null;
  /** Human-readable "why we picked this" line. */
  reason: string;
  /** Internal ranking score (not shown). */
  score: number;
}

const KID_KEYWORDS = ["family", "kid", "child", "beach", "water", "snorkel", "safari", "zoo", "park"];
const CALM_KEYWORDS = ["spa", "wellness", "yoga", "relax", "sunset", "scenic", "garden", "temple"];

/**
 * Rank DB destinations for a user. Returns at most `limit` items ordered by
 * personalization score. Falls back to a sensible "popular" ordering when the
 * user has no signal yet.
 */
export async function getRecommendationsForUser(
  userId: number,
  limit = 8
): Promise<{ items: RecommendedItem[]; personalized: boolean }> {
  const profile = await getTravelerProfile(userId);

  const rows = await prisma.destination.findMany({
    include: {
      images: { select: { url: true, isMain: true } },
      category: { select: { id: true, name: true } },
    },
    take: 200,
  });

  const scored = rows
    .map((r) => scoreDestination(r, profile))
    .filter((s) => s.imageUrl.length > 0); // never recommend an imageless card

  // Personalized ordering when we have signal; otherwise stable "popular" order.
  if (profile.hasSignal) {
    scored.sort((a, b) => b.score - a.score || b.price - a.price);
  } else {
    // No signal → newest/priced catalog so the rail still looks curated.
    scored.sort((a, b) => b.price - a.price);
  }

  const items = scored.slice(0, limit);
  const personalized = profile.hasSignal && items.some((i) => i.score > 0);

  return { items, personalized };
}

type DestRow = {
  id: number;
  title: string;
  description: string;
  slug: string | null;
  price: number | null;
  categoryId: number | null;
  images: { url: string; isMain: boolean }[];
  category: { id: number; name: string } | null;
};

function scoreDestination(r: DestRow, profile: TravelerProfile): RecommendedItem {
  const mainImage = r.images.find((i) => i.isMain)?.url || r.images[0]?.url || "";
  const haystack = `${r.title} ${r.description} ${r.category?.name ?? ""}`.toLowerCase();

  let score = 0;
  const reasons: { text: string; weight: number }[] = [];

  // 1. Interest-weight keyword overlap (styleTags, region, wishlist/viewed titles).
  for (const [word, weight] of Object.entries(profile.interestWeights)) {
    if (haystack.includes(word)) {
      score += weight;
      if (weight >= 5) reasons.push({ text: `Matches your interest in ${word}`, weight });
    }
  }

  // 2. Region affinity (strong, explicit).
  if (profile.regionPref && haystack.includes(profile.regionPref)) {
    score += 8;
    reasons.push({ text: `In ${capitalize(profile.regionPref)}, your preferred area`, weight: 8 });
  }

  // 3. Party-aware boosts.
  if (profile.paxProfile.hasKids && KID_KEYWORDS.some((k) => haystack.includes(k))) {
    score += 4;
    reasons.push({ text: "Great for travelling with kids", weight: 4 });
  }
  if (profile.paxProfile.hasSeniors && CALM_KEYWORDS.some((k) => haystack.includes(k))) {
    score += 3;
    reasons.push({ text: "Relaxed pace, senior-friendly", weight: 3 });
  }

  // 4. Affinity-title similarity ("because you liked X").
  const likedMatch = profile.affinityTitles.find((t) => {
    const toks = t.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
    return toks.some((tok) => haystack.includes(tok));
  });
  if (likedMatch) {
    score += 2;
    reasons.push({ text: `Similar to ${truncate(likedMatch, 32)}`, weight: 2 });
  }

  // Pick the strongest reason; default when nothing matched.
  reasons.sort((a, b) => b.weight - a.weight);
  const reason = reasons[0]?.text ?? "Popular with Bali travellers";

  return {
    id: `db-${r.id}`,
    source: "db",
    title: r.title,
    description: r.description,
    imageUrl: mainImage,
    price: r.price ?? 0,
    currency: "IDR",
    slug: r.slug ?? "",
    categoryId: r.categoryId,
    reason,
    score,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
