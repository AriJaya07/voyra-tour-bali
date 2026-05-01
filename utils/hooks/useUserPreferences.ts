"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { create } from "zustand";

export interface UserPreferences {
  partyAdults: number;
  partyChildren: number;
  partySeniors: number;
  partyInfants: number;
  styleTags: string[];
  dietary: string | null;
  mobility: string | null;
  regionPref: string | null;
  tripLengthDays: number | null;
}

const EMPTY: UserPreferences = {
  partyAdults: 2,
  partyChildren: 0,
  partySeniors: 0,
  partyInfants: 0,
  styleTags: [],
  dietary: null,
  mobility: null,
  regionPref: null,
  tripLengthDays: null,
};

interface PrefsStore {
  prefs: UserPreferences;
  loaded: boolean;
  setPrefs: (p: UserPreferences) => void;
}

export const usePrefsStore = create<PrefsStore>()((set) => ({
  prefs: EMPTY,
  loaded: false,
  setPrefs: (prefs) => set({ prefs, loaded: true }),
}));

/**
 * Auto-loads preferences once when authenticated.
 * Mount in a top-level provider (or rely on hooks that read).
 */
export function usePreferencesSync() {
  const { status } = useSession();
  const setPrefs = usePrefsStore((s) => s.setPrefs);

  useEffect(() => {
    if (status !== "authenticated") {
      setPrefs(EMPTY);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPrefs({
          partyAdults: data.partyAdults ?? 2,
          partyChildren: data.partyChildren ?? 0,
          partySeniors: data.partySeniors ?? 0,
          partyInfants: data.partyInfants ?? 0,
          styleTags: Array.isArray(data.styleTags) ? data.styleTags : [],
          dietary: data.dietary ?? null,
          mobility: data.mobility ?? null,
          regionPref: data.regionPref ?? null,
          tripLengthDays: data.tripLengthDays ?? null,
        });
      } catch {
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, setPrefs]);
}

/** Heuristic match: does a tour title/description match user's style tags? */
export function matchesStyle(
  text: string | undefined | null,
  styleTags: string[]
): { matched: boolean; tag: string | null } {
  if (!text || styleTags.length === 0) return { matched: false, tag: null };
  const lower = text.toLowerCase();
  const TAG_KEYWORDS: Record<string, string[]> = {
    adventure: ["adventure", "rafting", "trek", "hike", "atv", "zipline", "cliff", "climb"],
    culture: ["temple", "culture", "ceremony", "heritage", "traditional", "dance"],
    food: ["food", "cuisine", "cook", "tasting", "dining", "warung"],
    wellness: ["yoga", "spa", "massage", "wellness", "retreat", "meditation"],
    family: ["family", "kid", "child"],
    luxury: ["luxury", "private", "premium", "exclusive", "5-star"],
    budget: ["budget", "shared", "group tour", "affordable"],
    nightlife: ["nightlife", "club", "bar", "party"],
    nature: ["nature", "rice", "jungle", "forest", "waterfall"],
    beach: ["beach", "shore", "coast"],
    diving: ["dive", "scuba", "snorkel"],
    surf: ["surf"],
  };
  for (const tag of styleTags) {
    const kws = TAG_KEYWORDS[tag];
    if (!kws) continue;
    if (kws.some((kw) => lower.includes(kw))) {
      return { matched: true, tag };
    }
  }
  return { matched: false, tag: null };
}
