"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrefsStore } from "@/utils/hooks/useUserPreferences";
import { GUIDE_THEMES } from "@/lib/guides/readingTime";
import GuideCard from "./GuideCard";
import GuideCardFeatured from "./GuideCardFeatured";
import EmptyStateAi from "./EmptyStateAi";
import type { BaliNoteFallbackItem, GuideListItem } from "./types";

interface Props {
  guides: GuideListItem[];
  fallbackNotes: BaliNoteFallbackItem[];
}

const ALL_REGION = "__ALL__";

function score(prefs: { regionPref: string | null; styleTags: string[] }, g: GuideListItem): number {
  let s = 0;
  if (prefs.regionPref && g.region && g.region.toLowerCase() === prefs.regionPref.toLowerCase()) s += 5;
  for (const tag of g.tags) {
    if (prefs.styleTags.some((p) => p.toLowerCase() === tag.toLowerCase())) s += 1;
  }
  return s;
}

export default function GuidesBrowser({ guides, fallbackNotes }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const prefs = usePrefsStore((s) => s.prefs);

  const initialQ = search.get("q") ?? "";
  const initialRegion = search.get("region") ?? ALL_REGION;
  const initialTheme = search.get("theme") ?? "";

  const [q, setQ] = useState(initialQ);
  const [region, setRegion] = useState(initialRegion);
  const [theme, setTheme] = useState<string>(initialTheme);

  // URL sync — debounce text query, immediate for chips.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (region !== ALL_REGION) params.set("region", region);
      if (theme) params.set("theme", theme);
      const qs = params.toString();
      router.replace(qs ? `/guides?${qs}` : "/guides", { scroll: false });
    }, 200);
    return () => clearTimeout(id);
  }, [q, region, theme, router]);

  const regions = useMemo(() => {
    const set = new Map<string, number>();
    for (const g of guides) {
      if (!g.region) continue;
      set.set(g.region, (set.get(g.region) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [guides]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return guides.filter((g) => {
      if (region !== ALL_REGION && (g.region ?? "") !== region) return false;
      if (theme && !g.tags.some((t) => t.toLowerCase() === theme.toLowerCase())) return false;
      if (ql) {
        const hay = `${g.title} ${g.excerpt} ${g.tags.join(" ")} ${g.region ?? ""}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [guides, q, region, theme]);

  const featured = filtered[0] ?? null;
  const grid = filtered.slice(featured ? 1 : 0);

  const personalised = useMemo(() => {
    if (!prefs.regionPref && prefs.styleTags.length === 0) return [];
    return [...guides]
      .map((g) => ({ g, s: score(prefs, g) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.g);
  }, [guides, prefs]);

  const filterReason =
    q.trim() ||
    (region !== ALL_REGION ? region : "") ||
    (theme || "") ||
    "";

  const hasActiveFilter = q.trim() !== "" || region !== ALL_REGION || theme !== "";

  return (
    <div>
      {/* Search + facets */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm sticky top-2 z-20">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-400" aria-hidden>🔎</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by topic, region, or keyword…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            aria-label="Search guides"
          />
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setRegion(ALL_REGION);
                setTheme("");
              }}
              className="text-xs font-bold text-[#0071CE] hover:underline shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <Chip active={region === ALL_REGION} onClick={() => setRegion(ALL_REGION)}>
            All regions <span className="opacity-60">({guides.length})</span>
          </Chip>
          {regions.map(([name, count]) => (
            <Chip key={name} active={region === name} onClick={() => setRegion(name)}>
              {name} <span className="opacity-60">({count})</span>
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip active={theme === ""} onClick={() => setTheme("")} subtle>
            Any theme
          </Chip>
          {GUIDE_THEMES.map((t) => (
            <Chip key={t} active={theme === t} onClick={() => setTheme(theme === t ? "" : t)} subtle>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      {/* Picked for you */}
      {personalised.length > 0 && !hasActiveFilter && (
        <section className="my-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">For you</p>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">Picked from your preferences</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {personalised.map((g) => (
              <GuideCard
                key={g.id}
                guide={g}
                reasonLabel={
                  prefs.regionPref && g.region?.toLowerCase() === prefs.regionPref.toLowerCase()
                    ? `${g.region} match`
                    : "Style match"
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured + grid */}
      {filtered.length === 0 ? (
        <div className="my-10">
          <EmptyStateAi
            notes={fallbackNotes}
            filterReason={filterReason}
            resetHref={hasActiveFilter ? "/guides" : undefined}
          />
        </div>
      ) : (
        <div className="my-10 space-y-8">
          {featured && !hasActiveFilter && <GuideCardFeatured guide={featured} />}
          {grid.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(hasActiveFilter ? filtered : grid).map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  subtle,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-full border transition capitalize ${
        active
          ? subtle
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-[#0071CE] text-white border-[#0071CE]"
          : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
      }`}
    >
      {children}
    </button>
  );
}
