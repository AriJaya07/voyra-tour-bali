import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import Container from "@/components/Container";
import {
  AiGuideHero,
  AiGuideSteps,
  AiToolMatrix,
  AiAccuracyTips,
  AiGuideFAQ,
  AiGuideCTA,
} from "@/components/AiGuide";

export const metadata: Metadata = {
  title: "AI Tools · Voyra",
  description:
    "Plan a trip, ask the concierge, scan vouchers — every Voyra AI tool in one place. Includes pricing, your wallet, and a how-it-works guide.",
  openGraph: {
    title: "AI Tools · Voyra",
    description:
      "Every Voyra AI tool in one place — plan, concierge, cultural co-pilot, voucher reader.",
    images: ["/images/banner/banner-ai.png"],
    type: "article",
  },
};

const TOOLS: {
  href: string;
  emoji: string;
  title: string;
  blurb: string;
  cost: string;
  primary?: boolean;
}[] = [
  {
    href: "/ai/plan",
    emoji: "✨",
    title: "Plan a Trip",
    blurb: "Day-by-day Bali itinerary with bookable tours and local tips.",
    cost: "8 credits (≤7 days) · 12 (8–14 days)",
    primary: true,
  },
  {
    href: "/search",
    emoji: "🔎",
    title: "AI Search",
    blurb: "Describe your ideal day — budget, who's coming, the vibe — and get matched.",
    cost: "1 credit per search",
  },
  {
    href: "/ai/tools",
    emoji: "🛕",
    title: "Cultural co-pilot",
    blurb: "What ceremonies happen near my dates? Grounded in our calendar.",
    cost: "2 credits per question",
  },
  {
    href: "/ai/tools",
    emoji: "🌧️",
    title: "Day-of-Trip helper",
    blurb: "Real-time advice for weather, crowds, and last-minute plans.",
    cost: "Free for confirmed travelers · 3 credits otherwise",
  },
  {
    href: "/ai/tools",
    emoji: "📷",
    title: "Voucher reader",
    blurb: "Snap a tour voucher photo — auto-extract booking + add to calendar.",
    cost: "5 credits per scan",
  },
];

export default async function AiHubPage() {
  const session = await getServerSession(authOptions);
  const authed = !!session?.user?.id;

  return (
    <Container className="">
      <div className="pt-6 pb-12">
        <header className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            ✨ Voyra AI
          </span>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            AI Tools for your Bali trip
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Pick a tool below. Each one charges credits transparently — no surprise upgrades.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className={`group relative rounded-2xl border p-5 transition hover:shadow-md ${
                t.primary
                  ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-2xl mb-2" aria-hidden>
                {t.emoji}
              </div>
              <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.blurb}</p>
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {t.cost}
              </p>
              <span className="mt-3 block text-sm font-bold text-blue-600 group-hover:underline">
                Open →
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/ai/wallet"
            className="rounded-xl border border-violet-200 bg-violet-50 p-4 hover:bg-violet-100 transition"
          >
            <p className="text-sm font-bold text-violet-900">💳 Wallet & credits</p>
            <p className="mt-0.5 text-xs text-violet-700">
              Check balance, top up, manage subscription, family seats.
            </p>
          </Link>
          <Link
            href="/ai/pricing"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition"
          >
            <p className="text-sm font-bold text-amber-900">🎟️ Pricing</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Subscription tiers + one-time top-up packs. Compare costs.
            </p>
          </Link>
        </section>

        <details className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-base font-bold text-slate-900">
            How Voyra AI works (step-by-step)
          </summary>
          <div className="mt-4 space-y-2">
            <AiGuideHero authed={authed} />
            <AiGuideSteps />
            <AiToolMatrix />
            <AiAccuracyTips />
            <AiGuideFAQ />
            <AiGuideCTA authed={authed} />
          </div>
        </details>
      </div>
    </Container>
  );
}
