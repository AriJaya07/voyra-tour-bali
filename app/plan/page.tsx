"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePrefsStore } from "@/utils/hooks/useUserPreferences";
import { buildViatorProductUrl } from "@/lib/config/viator";
import BackLink from "@/components/common/BackLink";

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
  localHref?: string | null;
  imageUrl?: string;
  price?: number | null;
  rating?: number | null;
  durationMinutes?: number | null;
}

interface PlanMeta {
  viatorCount: number;
  candidatePoolSize: number;
  lowCoverage: boolean;
}

interface PlanResponse {
  title: string;
  days: number;
  summary: string;
  items: PlanItem[];
  meta?: PlanMeta;
}

interface BookBundleItem {
  day?: number;
  slot?: string;
  productCode: string;
  title: string;
  href: string | null;
  originalPrice: number | null;
  discountedPrice: number | null;
}

interface BookBundle {
  itineraryId: number;
  title: string;
  promoCode: string;
  promoDiscount: number;
  bundle: BookBundleItem[];
  totals: { currency: string; original: number; afterPromo: number; savings: number };
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
  const [daysDraft, setDaysDraft] = useState("5");
  const [budget, setBudget] = useState<"budget" | "moderate" | "luxury">("moderate");
  const [interests, setInterests] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [mode, setMode] = useState<"days" | "dates">("days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    setDaysDraft(String(days));
  }, [days]);

  const dateRangeError = useMemo(() => {
    if (mode !== "dates" || !fromDate || !toDate) return null;
    const f = new Date(fromDate);
    const t = new Date(toDate);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null;
    if (t < f) return "End date must be on or after start date";
    const diff = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
    if (diff > 14) return "Trip is limited to 14 days";
    return null;
  }, [mode, fromDate, toDate]);

  useEffect(() => {
    if (mode !== "dates" || !fromDate || !toDate || dateRangeError) return;
    const f = new Date(fromDate);
    const t = new Date(toDate);
    const diff = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
    setDays(Math.max(1, Math.min(14, diff)));
  }, [mode, fromDate, toDate, dateRangeError]);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedItineraryId, setSavedItineraryId] = useState<number | null>(null);
  const [savingShare, setSavingShare] = useState(false);
  const [bundle, setBundle] = useState<BookBundle | null>(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleBusy, setBundleBusy] = useState(false);

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
    setSavedItineraryId(null);
    setBundle(null);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          budget,
          interests,
          region,
          fromDate: mode === "dates" ? fromDate || null : null,
          toDate: mode === "dates" ? toDate || null : null,
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

  const buildItineraryBody = (visibility: "PRIVATE" | "PUBLIC") => ({
    title: plan?.title,
    fromDate: mode === "dates" ? fromDate || null : null,
    toDate: mode === "dates" ? toDate || null : null,
    party: {
      adults: prefs.partyAdults,
      children: prefs.partyChildren,
      seniors: prefs.partySeniors,
      infants: prefs.partyInfants,
    },
    itemsJson: plan?.items,
    visibility,
  });

  const savePrivate = async (): Promise<number | null> => {
    if (!plan) return null;
    try {
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildItineraryBody("PRIVATE")),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("We couldn't save your itinerary", {
          description: data?.error || "Something went wrong on our side. Please try again in a moment.",
        });
        return null;
      }
      const data = await res.json();
      const id = typeof data?.id === "number" ? data.id : null;
      setSaved(true);
      setSavedItineraryId(id);
      toast.success("Itinerary saved to your profile", {
        description: "You can revisit or share it any time from My Profile.",
        action: id
          ? {
              label: "Open",
              onClick: () => {
                window.location.href = `/profile/itineraries#it-${id}`;
              },
            }
          : undefined,
      });
      return id;
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please check your connection and try again.",
      });
      return null;
    }
  };

  const bookEverything = async () => {
    if (!plan) return;
    setBundleBusy(true);
    try {
      let id = savedItineraryId;
      if (!id) {
        id = await savePrivate();
        if (!id) {
          setBundleBusy(false);
          return;
        }
      }
      const res = await fetch("/api/ai/itinerary/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itineraryId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not build the bundle", {
          description: data?.error || "Try saving and opening from My Itineraries.",
        });
        return;
      }
      const data: BookBundle = await res.json();
      setBundle(data);
      setBundleOpen(true);
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please try again.",
      });
    } finally {
      setBundleBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to legacy fallback
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const saveAndShare = async () => {
    if (!plan) return;
    setSavingShare(true);
    try {
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildItineraryBody("PUBLIC")),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("We couldn't create your share link", {
          description: data?.error || "Something went wrong while saving. Please try again in a moment.",
        });
        return;
      }
      const data = await res.json();
      if (!data?.shareSlug) {
        toast.error("Share link unavailable", {
          description: "Your itinerary was saved, but we couldn't generate a public link. Try again from your profile.",
        });
        return;
      }
      const url = `${window.location.origin}/share/itinerary/${data.shareSlug}`;
      const copied = await copyToClipboard(url);
      setSaved(true);
      if (copied) {
        toast.success("Share link copied to your clipboard", {
          description: url,
          duration: 6000,
          action: {
            label: "Open",
            onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        toast.success("Itinerary is ready to share", {
          description: `Copy this link: ${url}`,
          duration: 9000,
          action: {
            label: "Copy",
            onClick: () => {
              copyToClipboard(url).then((ok) => {
                if (ok) toast.success("Link copied");
                else
                  toast.error("Copy not supported on this device", {
                    description: "Long-press the link in the toast to copy it manually.",
                  });
              });
            },
          },
        });
      }
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please check your connection and try again.",
      });
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
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <BackLink href="/profile" label="Back to profile" />
        </div>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-lg">
          <div
            aria-hidden
            className="absolute inset-0 bg-[url('/images/banner/banner-plan.png')] bg-cover bg-center pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/80 via-[#0071CE]/55 to-[#005ba6]/80 pointer-events-none"
          />
          <div className="relative z-10">
            <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              AI Trip Planner
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 drop-shadow">
              Build your perfect Bali plan
            </h1>
            <p className="text-blue-50 text-sm sm:text-base max-w-xl drop-shadow-sm">
              Tell us your dates, budget, and what you love. We&apos;ll combine real bookable tours with
              local tips into a day-by-day itinerary.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-8">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Plan settings</h2>

          <div className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <label className="block text-xs font-bold text-gray-700">Trip duration</label>
              <div
                role="tablist"
                aria-label="Trip duration mode"
                className="inline-flex bg-gray-100 rounded-lg p-0.5 self-start"
              >
                <button
                  role="tab"
                  aria-selected={mode === "days"}
                  type="button"
                  onClick={() => {
                    setMode("days");
                    setFromDate("");
                    setToDate("");
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    mode === "days"
                      ? "bg-white text-[#0071CE] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Days only
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "dates"}
                  type="button"
                  onClick={() => setMode("dates")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    mode === "dates"
                      ? "bg-white text-[#0071CE] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Specific dates
                </button>
              </div>
            </div>

            {mode === "days" ? (
              <div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={14}
                  value={daysDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDaysDraft(raw);
                    if (raw === "") return;
                    const n = parseInt(raw, 10);
                    if (!Number.isNaN(n)) setDays(Math.max(1, Math.min(14, n)));
                  }}
                  onBlur={() => {
                    const n = parseInt(daysDraft, 10);
                    const clamped = Number.isNaN(n) ? days : Math.max(1, Math.min(14, n));
                    setDays(clamped);
                    setDaysDraft(String(clamped));
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                  aria-label="Number of days"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {days} day{days === 1 ? "" : "s"} · 1–14
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    min={today}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || today}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                  />
                </div>
                <p className="sm:col-span-2 mt-0.5 text-[11px]">
                  {dateRangeError ? (
                    <span className="text-red-600 font-bold">{dateRangeError}</span>
                  ) : fromDate && toDate ? (
                    <span className="text-gray-500">
                      <span className="font-bold text-gray-700">
                        {days} day{days === 1 ? "" : "s"}
                      </span>{" "}
                      · AI tunes picks for season &amp; local events on these dates
                    </span>
                  ) : (
                    <span className="text-gray-400">Pick start and end dates (max 14 days)</span>
                  )}
                </p>
              </div>
            )}
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
                  <span>{interests.join(", ")}</span>
                </>
              )}
            </div>
            <button
              onClick={generate}
              disabled={loading || !!dateRangeError}
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
            disabled={loading || !!dateRangeError}
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-[#0071CE] border border-blue-100">
                    {plan.days} day{plan.days === 1 ? "" : "s"}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-[#0071CE] border border-blue-100 capitalize">
                    {budget}
                  </span>
                  {region && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      📍 {region} only
                    </span>
                  )}
                  {interests.map((i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => void savePrivate()}
                  disabled={saved}
                  className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition disabled:opacity-60"
                >
                  {saved ? "✓ Saved" : "💾 Save"}
                </button>
                <button
                  onClick={saveAndShare}
                  disabled={savingShare || saved}
                  className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-white hover:bg-blue-50 rounded-lg border border-blue-200 transition disabled:opacity-60"
                >
                  {savingShare ? "Saving…" : "🔗 Save & Share"}
                </button>
                {plan.items.some((it) => it.source === "viator") && (
                  <button
                    onClick={bookEverything}
                    disabled={bundleBusy}
                    className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#0071CE] to-[#005ba6] hover:opacity-90 rounded-lg transition shadow-sm disabled:opacity-60"
                  >
                    {bundleBusy ? "Building…" : "✨ Book all (5% off)"}
                  </button>
                )}
              </div>
            </div>

            {plan.meta?.lowCoverage && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-bold mb-0.5">Few bookable tours matched your filters.</p>
                <p>
                  We filled gaps with local tips. To get more bookable picks, try removing the region lock
                  or fewer specific interests.
                </p>
              </div>
            )}

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
                            <div className="self-center flex flex-col gap-1.5 shrink-0">
                              {href && (
                                <a
                                  href={href}
                                  target={href.startsWith("http") ? "_blank" : undefined}
                                  rel="noopener noreferrer sponsored"
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition text-center"
                                >
                                  Book
                                </a>
                              )}
                              {it.localHref && (
                                <Link
                                  href={it.localHref}
                                  className="px-3 py-1.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition text-center"
                                >
                                  On Voyra
                                </Link>
                              )}
                            </div>
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

      {bundleOpen && bundle && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setBundleOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{bundle.title} — bundle ready</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Promo <span className="font-mono">{bundle.promoCode}</span> applied (
                  {(bundle.promoDiscount * 100).toFixed(0)}% off)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBundleOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {bundle.bundle.map((b) => (
                <li key={b.productCode} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{b.title}</div>
                    <div className="text-xs text-slate-500">
                      Day {b.day ?? "?"} · {b.slot ?? "any"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {b.discountedPrice != null && b.originalPrice != null && (
                      <div className="text-right text-xs">
                        <div className="font-mono text-slate-400 line-through">${b.originalPrice}</div>
                        <div className="font-mono font-semibold text-emerald-600">${b.discountedPrice}</div>
                      </div>
                    )}
                    {b.href && (
                      <a
                        href={b.href}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="rounded-lg bg-[#0071CE] px-2.5 py-1 text-[10px] font-bold uppercase text-white hover:bg-[#005ba6]"
                      >
                        Book →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              You save <strong>${bundle.totals.savings}</strong> with the bundle.
              <br />
              Total {bundle.totals.currency} ${bundle.totals.afterPromo} (was ${bundle.totals.original}).
            </div>

            <p className="mt-3 text-xs text-slate-500">
              These items have been mirrored to your{" "}
              <Link href="/profile/itineraries" className="text-[#0071CE] underline">
                Imported Trips
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
