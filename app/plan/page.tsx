"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePrefsStore } from "@/utils/hooks/useUserPreferences";
import { buildViatorProductUrl } from "@/lib/config/viator";

const STYLE_TAGS = [
  "adventure",
  "culture",
  "food",
  "wellness",
  "family",
  "luxury",
  "budget",
  "nature",
  "beach",
  "diving",
  "surf",
];

const REGIONS = ["Ubud", "Canggu", "Seminyak", "Kuta", "Sanur", "Nusa Dua", "Uluwatu", "Lovina", "Amed", "Nusa Penida"];

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode?: string | null;
  title: string;
  source: "viator" | "tip" | "free";
  notes?: string;
  href?: string | null;
  imageUrl?: string;
  price?: number | null;
  rating?: number | null;
  durationMinutes?: number | null;
}

interface PlanResponse {
  title: string;
  days: number;
  summary: string;
  items: PlanItem[];
}

const SLOT_LABEL: Record<PlanItem["slot"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const SLOT_EMOJI: Record<PlanItem["slot"], string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
};

export default function PlanPage() {
  const { status } = useSession();
  const prefs = usePrefsStore((s) => s.prefs);

  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState<"budget" | "moderate" | "luxury">("moderate");
  const [interests, setInterests] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingShare, setSavingShare] = useState(false);

  useEffect(() => {
    if (prefs.styleTags.length > 0 && interests.length === 0) {
      setInterests(prefs.styleTags.slice(0, 4));
    }
    if (prefs.regionPref && !region) {
      setRegion(prefs.regionPref);
    }
    if (prefs.tripLengthDays && days === 5) {
      setDays(Math.min(14, prefs.tripLengthDays));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.styleTags.join(","), prefs.regionPref, prefs.tripLengthDays]);

  const toggleInterest = (id: string) => {
    setInterests((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          budget,
          interests,
          region,
          fromDate: fromDate || null,
          toDate: toDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Plan generation failed");
        return;
      }
      const data = await res.json();
      setPlan(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const savePrivate = async () => {
    if (!plan) return;
    const res = await fetch("/api/itineraries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: plan.title,
        fromDate: fromDate || null,
        toDate: toDate || null,
        party: {
          adults: prefs.partyAdults,
          children: prefs.partyChildren,
          seniors: prefs.partySeniors,
          infants: prefs.partyInfants,
        },
        itemsJson: plan.items,
        visibility: "PRIVATE",
      }),
    });
    if (res.ok) setSaved(true);
  };

  const saveAndShare = async () => {
    if (!plan) return;
    setSavingShare(true);
    try {
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: plan.title,
          fromDate: fromDate || null,
          toDate: toDate || null,
          party: {
            adults: prefs.partyAdults,
            children: prefs.partyChildren,
            seniors: prefs.partySeniors,
            infants: prefs.partyInfants,
          },
          itemsJson: plan.items,
          visibility: "PUBLIC",
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.shareSlug) {
        const url = `${window.location.origin}/share/itinerary/${data.shareSlug}`;
        try {
          await navigator.clipboard.writeText(url);
          alert(`Shareable link copied:\n${url}`);
        } catch {
          prompt("Copy this share link:", url);
        }
        setSaved(true);
      }
    } finally {
      setSavingShare(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Trip Planner</h1>
          <p className="text-gray-600 mb-6">Sign in to plan your perfect Bali itinerary.</p>
          <Link
            href="/login?callbackUrl=/plan"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#0071CE] to-[#005ba6] rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-lg">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            AI Trip Planner
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
            Build your perfect Bali plan
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl">
            Tell us your dates, budget, and what you love. We&apos;ll combine real bookable tours with
            local tips into a day-by-day itinerary.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-8">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Plan settings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Days</label>
              <input
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-700 mb-2">Budget</label>
            <div className="flex gap-2">
              {(["budget", "moderate", "luxury"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudget(b)}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition capitalize ${
                    budget === b
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-700 mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleInterest(t)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition capitalize ${
                    interests.includes(t)
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-2">Base region</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRegion(null)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                  !region
                    ? "bg-[#0071CE] text-white border-[#0071CE]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                }`}
              >
                Anywhere
              </button>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                    region === r
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="border-t border-gray-100 pt-5 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500 leading-relaxed min-w-0">
              <span className="font-bold text-gray-700">{days}-day</span>
              {" · "}
              <span className="capitalize">{budget}</span>
              {region && (
                <>
                  {" · "}
                  <span>{region}</span>
                </>
              )}
              {interests.length > 0 && (
                <>
                  {" · "}
                  <span className="truncate">{interests.length} interest{interests.length === 1 ? "" : "s"}</span>
                </>
              )}
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-sm shrink-0"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Building your plan…
                </>
              ) : (
                <>
                  <span aria-hidden>✨</span>
                  Generate itinerary
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sticky CTA on mobile when form is scrolled past */}
        {!plan && (
          <button
            onClick={generate}
            disabled={loading}
            className="sm:hidden fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 px-5 py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-500/30 transition"
            aria-label="Generate itinerary"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span aria-hidden>✨</span>
            )}
            {loading ? "Building…" : "Generate"}
          </button>
        )}

        {/* Plan output */}
        {plan && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between mb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{plan.title}</h2>
                {plan.summary && <p className="text-sm text-gray-600 mt-1">{plan.summary}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={savePrivate}
                  disabled={saved}
                  className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition disabled:opacity-60"
                >
                  {saved ? "✓ Saved" : "💾 Save"}
                </button>
                <button
                  onClick={saveAndShare}
                  disabled={savingShare || saved}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition shadow-sm disabled:opacity-60"
                >
                  {savingShare ? "Saving…" : "🔗 Save & Share"}
                </button>
              </div>
            </div>

            {/* Group by day */}
            {Array.from({ length: plan.days }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayItems = plan.items.filter((it) => it.day === dayNum);
              if (dayItems.length === 0) return null;
              return (
                <div key={dayNum} className="border border-gray-100 rounded-xl p-4 mb-3 bg-gray-50/40">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">Day {dayNum}</h3>
                  <div className="space-y-3">
                    {dayItems
                      .sort((a, b) => {
                        const order = { morning: 0, afternoon: 1, evening: 2 } as const;
                        return order[a.slot] - order[b.slot];
                      })
                      .map((it, i) => {
                        // Always rebuild the link from productCode + canonical title.
                        // Never trust an AI-supplied `href` — that's how wrong-destination links leak in.
                        const href = it.productCode
                          ? buildViatorProductUrl(it.productCode, it.title)
                          : null;
                        const durationLabel =
                          it.durationMinutes && it.durationMinutes > 0
                            ? it.durationMinutes >= 60
                              ? `${Math.round(it.durationMinutes / 60)}h`
                              : `${it.durationMinutes}m`
                            : null;
                        return (
                          <div
                            key={`${dayNum}-${i}`}
                            className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 flex gap-3"
                          >
                            <div className="text-xl shrink-0" aria-hidden>
                              {SLOT_EMOJI[it.slot]}
                            </div>
                            {it.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.imageUrl}
                                alt={it.title}
                                className="hidden sm:block w-20 h-16 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                {SLOT_LABEL[it.slot]}{" "}
                                {it.source === "viator" && (
                                  <span className="ml-1 text-[#0071CE]">· Bookable</span>
                                )}
                              </p>
                              <p className="font-bold text-sm text-gray-900 leading-snug">
                                {it.title}
                              </p>
                              {it.notes && (
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{it.notes}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                {it.price !== null && it.price !== undefined && (
                                  <span>From ${it.price}</span>
                                )}
                                {it.rating !== null && it.rating !== undefined && (
                                  <span>★ {it.rating.toFixed(1)}</span>
                                )}
                                {durationLabel && <span>· {durationLabel}</span>}
                              </div>
                            </div>
                            {href && (
                              <a
                                href={href}
                                target={href.startsWith("http") ? "_blank" : undefined}
                                rel="noopener noreferrer sponsored"
                                className="self-center px-3 py-1.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition shrink-0"
                              >
                                Book
                              </a>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}

            <p className="text-[11px] text-gray-400 mt-4">
              AI-generated based on your preferences and live tour catalog. Travel times and weather may
              vary; check each tour&apos;s page before booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
