"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { HiSparkles } from "react-icons/hi2";
import { useAiWallet } from "@/utils/hooks/useAiWallet";
import AiPromptDemo from "./AiPromptDemo";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });

/**
 * Homepage AI Hero — full-width strip beneath the main tour-search hero.
 * Auth-aware: signed-in users see live balance + plan + soonest expiry;
 * guests see the "50 free credits on signup" carrot.
 */
export default function AiHero() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const { data } = useAiWallet({ enabled: authed });

  return (
    <section
      aria-labelledby="ai-hero-heading"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1f44] via-[#1d3a78] to-[#3360c4] px-5 py-7 sm:px-8 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-1/3 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90 ring-1 ring-white/20 backdrop-blur">
            <HiSparkles className="h-3.5 w-3.5" /> Voyra AI
          </div>
          <h2
            id="ai-hero-heading"
            className="mt-3 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl"
          >
            Plan your Bali trip in minutes —{" "}
            <span className="text-amber-300">not afternoons.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
            Itineraries with bookable tours, ceremony calendar, weather pivots, and a
            day-of-trip helper that&apos;s free while you&apos;re travelling.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {authed ? (
              <>
                <Link
                  href="/profile/ai/tools"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-amber-100"
                >
                  Open AI tools →
                </Link>
                <Link
                  href="/plans"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  See plans
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-blue-900 transition hover:bg-amber-200"
                >
                  Try free — 50 credits, 7 days
                </Link>
                <Link
                  href="/plans"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  See plans
                </Link>
              </>
            )}
          </div>

          <p className="mt-3 text-[11px] text-white/60">
            ⏱ Subscription credits valid 365 days · 🔒 No card stored on file · ↩ 7-day refund
          </p>

          {authed && data ? (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/15 backdrop-blur">
              <span className="font-semibold">
                {data.balance.toLocaleString()} credits
              </span>
              <span className="opacity-50">·</span>
              <span>{data.planLabel}</span>
              {data.soonestExpiry ? (
                <>
                  <span className="opacity-50">·</span>
                  <span className="text-amber-200">
                    soonest expires {fmtDate(data.soonestExpiry.expiresAt)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <AiPromptDemo />
      </div>
    </section>
  );
}
