"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePrefsStore } from "@/utils/hooks/useUserPreferences";
import { buildViatorProductUrl } from "@/lib/config/viator";
import BackLink from "@/components/common/BackLink";
import { FEATURES } from "@/lib/config/features";
import PriceLabel from "@/components/common/PriceLabel";
import OptimizedImage from "@/components/common/OptimizedImage";

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

const MAX_INTERESTS = 8;

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

const LOADING_STAGES = [
  { key: "search",   label: "Searching Bali tour catalog…",  delayMs: 0 },
  { key: "filter",   label: "Filtering by your interests…",   delayMs: 1800 },
  { key: "assemble", label: "Assembling day-by-day plan…",    delayMs: 3800 },
  { key: "polish",   label: "Adding local tips & timing…",    delayMs: 5800 },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Tell us your trip",
    body: "Dates, party, budget, and what you love. Customize freely — add your own interests or pick a custom region.",
  },
  {
    step: 2,
    title: "AI builds your plan",
    body: "We pull live Viator tours that match, then fill the gaps with curated local tips. Everything is bookable or actionable.",
  },
  {
    step: 3,
    title: "Save, share, or book",
    body: "Save to your profile, share a link with travel buddies, or book the whole bundle in one tap.",
  },
];

// Static teaser shown to logged-out visitors so they can see what the AI produces.
const SAMPLE_DAY: { slot: PlanItem["slot"]; title: string; tag: string }[] = [
  { slot: "morning", title: "Tegallalang Rice Terraces + jungle swing", tag: "Tour" },
  { slot: "afternoon", title: "Balinese cooking class in Ubud", tag: "Tour" },
  { slot: "evening", title: "Sunset at Campuhan Ridge, dinner on Jl. Monkey Forest", tag: "Local tip" },
];

const LANDING_BENEFITS = [
  { icon: "🎟️", title: "Real bookable tours", body: "Live Viator inventory matched to your vibe — not generic suggestions." },
  { icon: "🧭", title: "Local tips fill the gaps", body: "Free things, food spots and timing curated for each slot." },
  { icon: "💾", title: "Save, share & book", body: "Keep plans in your profile, share a link, or book the bundle in one tap." },
  { icon: "🔍", title: "Refine any day", body: "\"More food\", \"less driving\", \"cheaper\" — reshape a day with AI anytime." },
];

export default function PlanPage() {
  const { status } = useSession();
  const prefs = usePrefsStore((s) => s.prefs);
  const setPrefs = usePrefsStore((s) => s.setPrefs);
  const searchParams = useSearchParams();

  const [days, setDays] = useState(5);
  const [daysDraft, setDaysDraft] = useState("5");
  const [budget, setBudget] = useState<"budget" | "moderate" | "luxury">("moderate");
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterestDraft, setCustomInterestDraft] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [regionMode, setRegionMode] = useState<"preset" | "custom">("preset");
  const [customRegionDraft, setCustomRegionDraft] = useState("");
  const [mode, setMode] = useState<"days" | "dates">("days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Inline party — synced to prefs store so user edits stick across pages.
  const [partyAdults, setPartyAdults] = useState(2);
  const [partyChildren, setPartyChildren] = useState(0);
  const [partySeniors, setPartySeniors] = useState(0);
  const [partyInfants, setPartyInfants] = useState(0);

  // One-shot ingest of ?region=&interests=&days= from incoming links
  const urlSeededRef = useRef(false);
  useEffect(() => {
    if (urlSeededRef.current) return;
    urlSeededRef.current = true;
    const r = searchParams.get("region");
    const i = searchParams.get("interests");
    const d = searchParams.get("days");
    if (r) {
      if (REGIONS.includes(r)) {
        setRegion(r);
      } else {
        setRegionMode("custom");
        setCustomRegionDraft(r);
        setRegion(r);
      }
    }
    if (i) {
      const list = i
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (list.length > 0) setInterests(list.slice(0, MAX_INTERESTS));
    }
    if (d) {
      const n = parseInt(d, 10);
      if (!Number.isNaN(n)) setDays(Math.max(1, Math.min(14, n)));
    }
  }, [searchParams]);

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
  const [loadingStage, setLoadingStage] = useState(0);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedItineraryId, setSavedItineraryId] = useState<number | null>(null);
  const [savingShare, setSavingShare] = useState(false);
  const [bundle, setBundle] = useState<BookBundle | null>(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [costEstimate, setCostEstimate] = useState<{ cost: number; balance: number } | null>(null);

  // Hydrate from prefs on first load
  useEffect(() => {
    if (prefs.styleTags.length > 0 && interests.length === 0) {
      setInterests(prefs.styleTags.slice(0, MAX_INTERESTS));
    }
    if (prefs.regionPref && !region) {
      if (REGIONS.includes(prefs.regionPref)) {
        setRegion(prefs.regionPref);
      } else {
        setRegionMode("custom");
        setCustomRegionDraft(prefs.regionPref);
        setRegion(prefs.regionPref);
      }
    }
    if (prefs.tripLengthDays && days === 5) {
      setDays(Math.min(14, prefs.tripLengthDays));
    }
    setPartyAdults(prefs.partyAdults || 2);
    setPartyChildren(prefs.partyChildren || 0);
    setPartySeniors(prefs.partySeniors || 0);
    setPartyInfants(prefs.partyInfants || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.styleTags.join(","), prefs.regionPref, prefs.tripLengthDays, prefs.partyAdults, prefs.partyChildren, prefs.partySeniors, prefs.partyInfants]);

  // Cost preview — fetch on form change (debounced)
  const fetchCost = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/preview-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "plan", params: { days } }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.cost === "number" && typeof data?.balance === "number") {
        setCostEstimate({ cost: data.cost, balance: data.balance });
      }
    } catch {
      /* silent */
    }
  }, [days]);

  useEffect(() => {
    if (FEATURES.freeAiPlanner) return; // planner is free — no credit preview
    if (status !== "authenticated") return;
    const t = setTimeout(fetchCost, 300);
    return () => clearTimeout(t);
  }, [status, fetchCost]);

  // Loading stage cycler
  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STAGES.forEach((s, idx) => {
      timers.push(setTimeout(() => setLoadingStage(idx), s.delayMs));
    });
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const toggleInterest = (id: string) => {
    setInterests((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= MAX_INTERESTS) {
        toast.info(`You can pick up to ${MAX_INTERESTS} interests`);
        return s;
      }
      return [...s, id];
    });
  };

  const addCustomInterest = () => {
    const raw = customInterestDraft.trim().toLowerCase();
    if (!raw) return;
    const cleaned = raw.replace(/[^a-z0-9 \-]/g, "").replace(/\s+/g, " ").slice(0, 24);
    if (!cleaned) return;
    if (interests.includes(cleaned)) {
      toast.info("Already added");
      return;
    }
    if (interests.length >= MAX_INTERESTS) {
      toast.info(`You can pick up to ${MAX_INTERESTS} interests`);
      return;
    }
    setInterests((s) => [...s, cleaned]);
    setCustomInterestDraft("");
  };

  const removeInterest = (id: string) => {
    setInterests((s) => s.filter((x) => x !== id));
  };

  const setPresetRegion = (r: string | null) => {
    setRegionMode("preset");
    setRegion(r);
    setCustomRegionDraft("");
  };

  const onCustomRegionChange = (v: string) => {
    setCustomRegionDraft(v);
    setRegion(v.trim() || null);
  };

  const resetForm = () => {
    setDays(5);
    setBudget("moderate");
    setInterests([]);
    setRegion(null);
    setRegionMode("preset");
    setCustomRegionDraft("");
    setCustomInterestDraft("");
    setMode("days");
    setFromDate("");
    setToDate("");
    setError(null);
    toast.success("Reset to defaults");
  };

  const persistPartyToPrefs = async () => {
    setPrefs({
      ...prefs,
      partyAdults,
      partyChildren,
      partySeniors,
      partyInfants,
    });
    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyAdults,
          partyChildren,
          partySeniors,
          partyInfants,
        }),
      });
    } catch {
      /* silent — store has the value already */
    }
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setSaved(false);
    setSavedItineraryId(null);
    setBundle(null);

    void persistPartyToPrefs();

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
      setTimeout(() => {
        document.getElementById("plan-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      void fetchCost();
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
      adults: partyAdults,
      children: partyChildren,
      seniors: partySeniors,
      infants: partyInfants,
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
                window.location.href = `/trips#it-${id}`;
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
        /* fall through */
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

  const totalPax = partyAdults + partyChildren + partySeniors + partyInfants;
  const insufficientCredits = costEstimate ? costEstimate.balance < costEstimate.cost : false;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-[15px] sm:px-[30px] 2xl:px-0">
        <div className="max-w-[1280px] mx-auto space-y-6">
          <div className="h-56 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  // Planner is free for guests when FEATURES.freeAiPlanner — no login landing wall.
  if (!FEATURES.freeAiPlanner && status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 pt-8 pb-16 px-[15px] sm:px-[30px] 2xl:px-0">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-4">
            <BackLink href="/ai" label="Back to AI hub" />
          </div>

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-12 text-white mb-6 shadow-lg">
            <div
              aria-hidden
              className="absolute inset-0 bg-[url('/images/banner/banner-plan.png')] bg-cover bg-center pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/85 via-[#0071CE]/60 to-[#005ba6]/85 pointer-events-none"
            />
            <div className="relative z-10 max-w-xl">
              <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                AI Trip Planner
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 drop-shadow">
                Your perfect Bali itinerary, built in 30 seconds
              </h1>
              <p className="text-blue-50 text-sm sm:text-base drop-shadow-sm mb-6">
                Tell us your dates, budget and vibe. AI blends real bookable tours with local tips into a
                day-by-day plan you can save, share, and book.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login?callbackUrl=/ai/plan"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition shadow-sm"
                >
                  Sign in to start
                </Link>
                <Link
                  href="/register?callbackUrl=/ai/plan"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white/15 border border-white/40 text-white font-bold rounded-full hover:bg-white/25 transition"
                >
                  Create free account
                </Link>
              </div>
              <p className="text-blue-100/90 text-xs mt-3">Free monthly AI credits included — no card required.</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {LANDING_BENEFITS.map((b) => (
              <div key={b.title} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3">
                <span className="text-2xl shrink-0" aria-hidden>{b.icon}</span>
                <div>
                  <p className="font-bold text-sm text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.step} className="flex gap-3 sm:flex-col sm:gap-2">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#0071CE] to-[#005ba6] text-white text-sm font-bold flex items-center justify-center shadow">
                    {s.step}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample itinerary teaser */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Sample: Day 1 in Ubud</h2>
              <span className="text-[10px] font-bold text-[#0071CE] bg-blue-50 px-2 py-0.5 rounded-full">Preview</span>
            </div>
            <div className="space-y-2">
              {SAMPLE_DAY.map((it) => (
                <div key={it.slot} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-lg shrink-0" aria-hidden>{SLOT_EMOJI[it.slot]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{SLOT_LABEL[it.slot]}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{it.title}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {it.tag}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Your real plan adapts to your dates, party, budget and interests.</p>
          </div>

          {/* Final CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0071CE] to-[#005ba6] p-6 text-center text-white shadow-lg">
            <p className="font-bold text-lg mb-1">Ready to plan your trip?</p>
            <p className="text-blue-100 text-sm mb-4">Sign in and get your first itinerary in under a minute.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login?callbackUrl=/ai/plan"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition"
              >
                Sign in
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/15 border border-white/40 text-white font-bold rounded-full hover:bg-white/25 transition"
              >
                Explore Bali first
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-[15px] sm:px-[30px] 2xl:px-0">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-4">
          <BackLink href="/ai" label="Back to AI hub" />
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-10 text-white mb-6 shadow-lg">
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

        {/* How it works (3-step explainer) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex gap-3 sm:flex-col sm:gap-2">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#0071CE] to-[#005ba6] text-white text-sm font-bold flex items-center justify-center shadow">
                  {s.step}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-8 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Plan settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Customize anything — add your own interests or region.</p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Section 1: Dates */}
          <Section step={1} title="Dates" hint="Pick a duration or specific dates (max 14 days).">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <span className="block text-xs font-bold text-gray-700">Trip duration</span>
              <div role="tablist" aria-label="Trip duration mode" className="inline-flex bg-gray-100 rounded-lg p-0.5 self-start">
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
                    mode === "days" ? "bg-white text-[#0071CE] shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                    mode === "dates" ? "bg-white text-[#0071CE] shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[3, 5, 7, 10, 14].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDays(n)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
                        days === n
                          ? "bg-[#0071CE] text-white border-[#0071CE]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#0071CE]/40"
                      }`}
                    >
                      {n}d
                    </button>
                  ))}
                </div>
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
          </Section>

          {/* Section 2: Travelers */}
          <Section step={2} title="Travelers" hint="Group sizing — kids and seniors get age-appropriate picks.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PartyInput label="Adults"   sub="13+"   value={partyAdults}   min={1} onChange={setPartyAdults} />
              <PartyInput label="Children" sub="3–12"  value={partyChildren} min={0} onChange={setPartyChildren} />
              <PartyInput label="Seniors"  sub="65+"   value={partySeniors}  min={0} onChange={setPartySeniors} />
              <PartyInput label="Infants"  sub="<3"    value={partyInfants}  min={0} onChange={setPartyInfants} />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Total {totalPax} traveler{totalPax === 1 ? "" : "s"} — auto-saves to your profile preferences.
            </p>
          </Section>

          {/* Section 3: Budget */}
          <Section step={3} title="Budget" hint="Sets price tier across tours and tips.">
            <div className="flex gap-2">
              {(["budget", "moderate", "luxury"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudget(b)}
                  className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-lg border transition capitalize ${
                    budget === b
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  <span className="block">{b}</span>
                  <span className={`block text-[10px] mt-0.5 font-semibold ${budget === b ? "text-blue-100" : "text-gray-400"}`}>
                    {b === "budget" ? "Under $$" : b === "moderate" ? "Balanced" : "Premium"}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Section 4: Interests (custom-friendly) */}
          <Section
            step={4}
            title="Interests"
            hint={`Pick from common tags or add your own (max ${MAX_INTERESTS}).`}
          >
            <div className="flex flex-wrap gap-2 mb-3">
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

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterestDraft}
                onChange={(e) => setCustomInterestDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomInterest();
                  }
                }}
                placeholder="Add your own (e.g. waterfalls, photography, vegan)"
                maxLength={24}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
              <button
                type="button"
                onClick={addCustomInterest}
                disabled={!customInterestDraft.trim() || interests.length >= MAX_INTERESTS}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                + Add
              </button>
            </div>

            {/* Selected chips with remove */}
            {interests.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Selected ({interests.length}/{MAX_INTERESTS})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-[#0071CE] border border-blue-100 capitalize"
                    >
                      {i}
                      <button
                        type="button"
                        onClick={() => removeInterest(i)}
                        className="ml-0.5 text-blue-400 hover:text-[#0071CE]"
                        aria-label={`Remove ${i}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Section 5: Region */}
          <Section step={5} title="Base region" hint="Pick a region to lock all picks nearby, or anywhere for variety.">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPresetRegion(null)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                  !region && regionMode === "preset"
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
                  onClick={() => setPresetRegion(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                    region === r && regionMode === "preset"
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setRegionMode("custom");
                  setRegion(customRegionDraft.trim() || null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                  regionMode === "custom"
                    ? "bg-[#0071CE] text-white border-[#0071CE]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                }`}
              >
                + Other
              </button>
            </div>

            {regionMode === "custom" && (
              <input
                type="text"
                value={customRegionDraft}
                onChange={(e) => onCustomRegionChange(e.target.value)}
                placeholder="e.g. Sidemen, Munduk, Tegallalang"
                maxLength={40}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            )}
          </Section>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Live preview + cost + generate */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            {/* Live preview summary */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                Generating
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                {days}-day <span className="capitalize">{budget}</span> trip
                {region ? <> in <span className="font-bold text-[#0071CE]">{region}</span></> : <> across <span className="font-bold text-[#0071CE]">all of Bali</span></>}
                {" · "}
                {totalPax} traveler{totalPax === 1 ? "" : "s"}
              </p>
              {interests.length > 0 ? (
                <p className="text-xs text-gray-600 mt-1">
                  Focused on{" "}
                  {interests.map((i, idx) => (
                    <span key={i}>
                      <span className="font-semibold capitalize">{i}</span>
                      {idx < interests.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-xs text-gray-500 italic mt-1">No interests picked — AI mixes top-rated picks.</p>
              )}
            </div>

            {/* Cost + generate */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {FEATURES.freeAiPlanner && (
                <div className="text-xs font-semibold flex items-center gap-1.5 text-gray-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  Free — no account needed
                  {FEATURES.aiMonetization && (
                    <>
                      <span className="text-gray-400">·</span>
                      <Link
                        href="/ai/pricing"
                        className="text-[#0071CE] underline-offset-2 hover:underline"
                      >
                        Want more AI? See plans
                      </Link>
                    </>
                  )}
                </div>
              )}
              {!FEATURES.freeAiPlanner && costEstimate && (
                <div className={`text-xs font-semibold flex items-center gap-1.5 ${insufficientCredits ? "text-amber-700" : "text-gray-600"}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${insufficientCredits ? "bg-amber-500" : "bg-emerald-500"}`} />
                  Cost: <span className="font-bold">{costEstimate.cost} credits</span>
                  <span className="text-gray-400">·</span>
                  You have <span className="font-bold">{costEstimate.balance}</span>
                  {insufficientCredits && (
                    <Link href="/ai/wallet" className="ml-1 text-[#0071CE] underline-offset-2 hover:underline">
                      Top up
                    </Link>
                  )}
                </div>
              )}
              <button
                onClick={generate}
                disabled={loading || !!dateRangeError || insufficientCredits}
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
        </div>

        {/* Sticky CTA on mobile */}
        {!plan && (
          <button
            onClick={generate}
            disabled={loading || !!dateRangeError || insufficientCredits}
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

        {/* Loading skeleton with stages */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              AI is working
            </p>
            <ul className="space-y-2">
              {LOADING_STAGES.map((s, idx) => {
                const done = idx < loadingStage;
                const active = idx === loadingStage;
                return (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-[#0071CE] text-white animate-pulse"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? "✓" : idx + 1}
                    </span>
                    <span className={`${done ? "text-gray-400 line-through" : active ? "text-gray-900 font-semibold" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Plan output */}
        {plan && !loading && (
          <div id="plan-output" className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
            {/* Header — full width, breathable */}
            <header className="mb-5">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {plan.title}
              </h2>
              {plan.summary && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{plan.summary}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-[#0071CE] border border-blue-100">
                  {plan.days} day{plan.days === 1 ? "" : "s"}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-[#0071CE] border border-blue-100 capitalize">
                  {budget}
                </span>
                {region && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    📍 {region}
                  </span>
                )}
                {plan.meta?.viatorCount !== undefined && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    {plan.meta.viatorCount} bookable
                  </span>
                )}
                {interests.slice(0, 4).map((i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 capitalize"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </header>

            {/* Action bar — primary emphasized, secondaries grouped */}
            <div className="mb-5 pb-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              {plan.items.some((it) => it.source === "viator") ? (
                <button
                  onClick={bookEverything}
                  disabled={bundleBusy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#0071CE] to-[#005ba6] hover:opacity-90 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-60"
                >
                  <span aria-hidden>✨</span>
                  {bundleBusy ? "Preparing…" : "Book all tours"}
                </button>
              ) : (
                <button
                  onClick={() => void savePrivate()}
                  disabled={saved}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-60"
                >
                  {saved ? "✓ Saved" : "💾 Save itinerary"}
                </button>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {plan.items.some((it) => it.source === "viator") && (
                  <button
                    onClick={() => void savePrivate()}
                    disabled={saved}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition disabled:opacity-60"
                  >
                    <span aria-hidden>💾</span>
                    {saved ? "Saved" : "Save"}
                  </button>
                )}
                <button
                  onClick={saveAndShare}
                  disabled={savingShare || saved}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition disabled:opacity-60"
                  title="Save publicly and copy share link"
                >
                  <span aria-hidden>🔗</span>
                  {savingShare ? "Saving…" : "Share"}
                </button>
                <button
                  onClick={generate}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                  title="Regenerate with same settings"
                >
                  <span aria-hidden>↻</span>
                  Try again
                </button>
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

            {/* Day-by-day timeline */}
            {Array.from({ length: plan.days }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayItems = plan.items.filter((it) => it.day === dayNum);
              if (dayItems.length === 0) return null;
              return (
                <div key={dayNum} className="relative pl-6 pb-2">
                  {/* Timeline rail */}
                  <div aria-hidden className="absolute left-[9px] top-2 bottom-0 w-px bg-gradient-to-b from-[#0071CE]/40 to-transparent" />
                  <div aria-hidden className="absolute left-0 top-1.5 w-[19px] h-[19px] rounded-full bg-white border-[3px] border-[#0071CE] shadow" />

                  <h3 className="font-black text-base text-gray-900 mb-3">
                    Day {dayNum}
                    <span className="ml-2 text-xs font-semibold text-gray-400">
                      {dayItems.length} {dayItems.length === 1 ? "activity" : "activities"}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {dayItems
                      .sort((a, b) => {
                        const order = { morning: 0, afternoon: 1, evening: 2 } as const;
                        return order[a.slot] - order[b.slot];
                      })
                      .map((it, i) => {
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
                            className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 flex gap-3 hover:border-[#0071CE]/30 hover:shadow-md transition"
                          >
                            <div className="text-xl shrink-0" aria-hidden>
                              {SLOT_EMOJI[it.slot]}
                            </div>
                            {it.imageUrl && (
                              <OptimizedImage
                                src={it.imageUrl}
                                alt={it.title}
                                width={80}
                                height={64}
                                className="hidden sm:block w-20 h-16 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                                {SLOT_LABEL[it.slot]}
                                {it.source === "viator" && (
                                  <span className="px-1.5 py-px text-[9px] font-bold text-[#0071CE] bg-blue-50 border border-blue-100 rounded">
                                    BOOKABLE
                                  </span>
                                )}
                                {it.source === "tip" && (
                                  <span className="px-1.5 py-px text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded">
                                    LOCAL TIP
                                  </span>
                                )}
                              </p>
                              <p className="font-bold text-sm text-gray-900 leading-snug mt-0.5">
                                {it.title}
                              </p>
                              {it.notes && (
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{it.notes}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                                {it.price !== null && it.price !== undefined && (
                                  <PriceLabel
                                    amount={it.price}
                                    sourceCurrency="USD"
                                    prefix="From "
                                  />
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

            <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
              AI-generated based on your preferences and live tour catalog. Travel times and weather may
              vary; check each tour&apos;s page before booking.
            </p>
          </div>
        )}
      </div>

      {/* Bundle modal (unchanged) */}
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
              <div className="flex items-start gap-3 min-w-0">
                <div
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl"
                >
                  ✨
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Your bundle is ready
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{bundle.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBundleOpen(false)}
                className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              {bundle.bundle.length} {bundle.bundle.length === 1 ? "tour" : "tours"} ready to book
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {bundle.bundle.map((b) => {
                const slotLabel =
                  b.slot && b.slot !== "any"
                    ? b.slot.charAt(0).toUpperCase() + b.slot.slice(1)
                    : "Anytime";
                const dayLabel = b.day ? `Day ${b.day}` : "Flexible";
                return (
                  <li key={b.productCode} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {b.title}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {dayLabel}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {slotLabel}
                        </span>
                      </div>
                      {b.originalPrice != null && (
                        <div className="mt-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            From ${b.originalPrice}
                          </span>
                        </div>
                      )}
                    </div>
                    {b.href && (
                      <a
                        href={b.href}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#0071CE] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ba6] transition shadow-sm"
                      >
                        Book
                        <span aria-hidden>↗</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">Estimated total</span>
                <span className="font-mono text-base font-bold text-slate-900">
                  From {bundle.totals.currency} ${bundle.totals.original}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Final price set by Viator at checkout. Each tour is booked separately.
              </p>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              Tap <strong>Book</strong> on each tour to complete payment on Viator. We&apos;ve also
              saved everything to your{" "}
              <Link href="/trips" className="font-semibold text-[#0071CE] hover:underline">
                My Trips
              </Link>{" "}
              so you can come back to it anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0071CE]/10 text-[#0071CE] text-[10px] font-bold">
          {step}
        </span>
        <h3 className="font-bold text-sm text-gray-900">{title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

function PartyInput({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(20, value + 1));
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5">
      <p className="text-[11px] font-bold text-gray-700">{label}</p>
      <p className="text-[10px] text-gray-400 mb-1.5">{sub}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-bold text-gray-900 tabular-nums">{value}</span>
        <button
          type="button"
          onClick={inc}
          className="w-7 h-7 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
