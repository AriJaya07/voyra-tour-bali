"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import BackLink from "@/components/common/BackLink";

const STYLE_TAGS: { id: string; label: string; emoji: string }[] = [
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "culture", label: "Culture", emoji: "🛕" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "budget", label: "Budget", emoji: "💸" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "diving", label: "Diving", emoji: "🤿" },
  { id: "surf", label: "Surf", emoji: "🏄" },
];

const REGIONS = ["Ubud", "Canggu", "Seminyak", "Kuta", "Sanur", "Nusa Dua", "Uluwatu", "Lovina", "Amed", "Nusa Penida"];

interface Prefs {
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

const DEFAULTS: Prefs = {
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

export default function TravelProfilePage() {
  const { status } = useSession();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/user/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
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
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const toggleTag = (id: string) => {
    setPrefs((p) => ({
      ...p,
      styleTags: p.styleTags.includes(id) ? p.styleTags.filter((t) => t !== id) : [...p.styleTags, id],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save preferences" });
        return;
      }
      setMessage({ type: "success", text: "Travel profile saved" });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">You are not signed in</h1>
          <p className="text-gray-600 mb-6">Sign in to set your travel preferences.</p>
          <Link
            href="/login"
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
        <div className="flex items-center gap-2 mb-2">
          <BackLink href="/profile" label="Back to profile" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Travel Profile</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tell us about your trip so we can show you tours that fit. Used by AI suggestions and trip planner.
        </p>

        {message && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl border text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={save} className="space-y-6">
          {/* Party */}
          <Card title="Party size" subtitle="Defaults that pre-fill your bookings.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NumField
                label="Adults"
                value={prefs.partyAdults}
                onChange={(v) => setPrefs((p) => ({ ...p, partyAdults: v }))}
                min={0}
                max={20}
              />
              <NumField
                label="Children"
                value={prefs.partyChildren}
                onChange={(v) => setPrefs((p) => ({ ...p, partyChildren: v }))}
                min={0}
                max={20}
              />
              <NumField
                label="Seniors"
                value={prefs.partySeniors}
                onChange={(v) => setPrefs((p) => ({ ...p, partySeniors: v }))}
                min={0}
                max={20}
              />
              <NumField
                label="Infants"
                value={prefs.partyInfants}
                onChange={(v) => setPrefs((p) => ({ ...p, partyInfants: v }))}
                min={0}
                max={20}
              />
            </div>
          </Card>

          {/* Style */}
          <Card title="Travel style" subtitle="Pick anything that sounds like you.">
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((t) => {
                const active = prefs.styleTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-full border transition ${
                      active
                        ? "bg-[#0071CE] text-white border-[#0071CE] shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                    }`}
                  >
                    <span className="mr-1">{t.emoji}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Region */}
          <Card title="Where are you staying?" subtitle="So we suggest tours close to your base.">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, regionPref: null }))}
                className={`px-3 py-2 text-xs font-bold rounded-full border transition ${
                  !prefs.regionPref
                    ? "bg-[#0071CE] text-white border-[#0071CE]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                }`}
              >
                Anywhere
              </button>
              {REGIONS.map((r) => {
                const active = prefs.regionPref === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, regionPref: r }))}
                    className={`px-3 py-2 text-xs font-bold rounded-full border transition ${
                      active
                        ? "bg-[#0071CE] text-white border-[#0071CE]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Trip length + dietary + mobility */}
          <Card title="Other preferences">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trip length (days, optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={59}
                  value={prefs.tripLengthDays ?? ""}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      tripLengthDays: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 7"
                  className="w-32 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Dietary needs
                </label>
                <input
                  type="text"
                  value={prefs.dietary ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, dietary: e.target.value || null }))}
                  maxLength={200}
                  placeholder="e.g. Halal, vegan, peanut allergy"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobility / accessibility
                </label>
                <input
                  type="text"
                  value={prefs.mobility ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, mobility: e.target.value || null }))}
                  maxLength={200}
                  placeholder="e.g. Wheelchair, knee injury, slow pace OK"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Travel Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-bold text-gray-900 text-base">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4 mt-0.5">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:text-[#0071CE] hover:border-[#0071CE]/40 transition cursor-pointer"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center font-bold text-sm text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:text-[#0071CE] hover:border-[#0071CE]/40 transition cursor-pointer"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
