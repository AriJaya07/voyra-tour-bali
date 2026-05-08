"use client";

import { useState } from "react";
import Link from "next/link";

interface ShowcaseTab {
  key: string;
  emoji: string;
  label: string;
  prompt: string;
  reply: string[];
  cta: { href: string; label: string };
}

const TABS: ShowcaseTab[] = [
  {
    key: "plan",
    emoji: "🗺️",
    label: "Plan a 5-day trip",
    prompt: "Plan a 5-day Bali honeymoon — beaches + spa + cultural temple sunset.",
    reply: [
      "Day 1 · Seminyak: Jet-lag recovery + beachfront sunset cocktails.",
      "Day 2 · Uluwatu: Cliff temple + Kecak fire dance + seafood at Jimbaran.",
      "Day 3 · Ubud: Tegallalang rice terraces + balian healer + couples spa.",
      "Day 4 · Sidemen: Rice paddy bike tour + bamboo cooking class + fireflies.",
      "Day 5 · Nusa Penida: Kelingking viewpoint + Crystal Bay snorkel.",
    ],
    cta: { href: "/ai/plan", label: "Build my plan →" },
  },
  {
    key: "concierge",
    emoji: "💬",
    label: "Concierge with memory",
    prompt: "Same family, what's a good half-day for grandparents next visit?",
    reply: [
      "Remembering: 2 adults, 1 senior (knee mobility), staying in Ubud.",
      "Half-day option: Tegenungan Falls upper-deck café (no stairs) + lunch at Locavore",
      "+ a 1h Balinese massage at COMO Shambhala. Total budget covered for the family.",
    ],
    cta: { href: "/ai/wallet", label: "Unlock with Voyager →" },
  },
  {
    key: "voucher",
    emoji: "📷",
    label: "Voucher reader",
    prompt: "Drop a tour voucher photo — get it on your trip calendar in seconds.",
    reply: [
      "→ Detected: Mt Batur Sunrise Trek, 12 March 2026, 02:30 AM pickup",
      "→ Lead: Sarah Mitchell · 2 pax · Voucher #VRT-87421",
      "✓ Saved to Trip Calendar · ✓ Added to Imported Trips",
    ],
    cta: { href: "/ai/tools", label: "Try voucher reader →" },
  },
];

/**
 * Tabbed showcase below the AI Hero. Lightweight: no streaming, no API call —
 * curated previews to communicate value before the user signs up.
 */
export default function AiShowcase() {
  const [active, setActive] = useState(TABS[0]?.key ?? "plan");
  const tab = TABS.find((t) => t.key === active) ?? TABS[0]!;

  return (
    <section
      aria-labelledby="ai-showcase-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="ai-showcase-heading"
          className="text-lg font-bold text-slate-900 sm:text-xl"
        >
          See AI in action
        </h2>
        <Link
          href={tab.cta.href}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {tab.cta.label}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              t.key === active
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            You
          </div>
          <p className="mt-1 text-sm text-slate-800">{tab.prompt}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
            Voyra AI
          </div>
          <ul className="mt-1 space-y-1 text-sm text-slate-800">
            {tab.reply.map((line) => (
              <li key={line} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Examples shown for illustration. Real responses use live Bali tour
        availability, weather, and your traveler profile.
      </p>
    </section>
  );
}
