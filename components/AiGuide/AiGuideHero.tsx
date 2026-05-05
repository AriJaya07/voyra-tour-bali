import Link from "next/link";
import { HiSparkles } from "react-icons/hi2";
import AiPromptDemo from "./AiPromptDemo";

interface Props {
  authed: boolean;
}

/**
 * AI guide hero — banner-ai.png cover background with light blue overlay so
 * the photo dominates while the headline + CTAs stay legible. Auth-aware
 * action buttons.
 */
export default function AiGuideHero({ authed }: Props) {
  return (
    <section
      aria-labelledby="ai-guide-hero-heading"
      className="relative overflow-hidden rounded-3xl bg-slate-900 px-5 py-8 sm:px-8 sm:py-12"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/banner/banner-ai.png')] bg-cover bg-center pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#0a1f44]/75 via-[#1d3a78]/60 to-[#3360c4]/70 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a2a55]/85 via-[#0a2a55]/45 to-transparent pointer-events-none"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/95 ring-1 ring-white/25 backdrop-blur">
            <HiSparkles className="h-3.5 w-3.5" /> Voyra AI · How it works
          </div>
          <h1
            id="ai-guide-hero-heading"
            className="mt-3 text-2xl font-black leading-tight drop-shadow sm:text-3xl lg:text-4xl"
          >
            Plan your Bali trip with AI —{" "}
            <span className="text-amber-300">smart, transparent, on your terms.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">
            A guided walkthrough: what each AI tool does, how credits work, and how to
            ask questions you can actually act on.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:max-w-md lg:flex lg:max-w-none lg:flex-wrap lg:items-center">
            {authed ? (
              <>
                <Link
                  href="/ai/tools"
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-amber-100 sm:w-auto"
                >
                  Open AI tools →
                </Link>
                <Link
                  href="/ai/pricing"
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
                >
                  See plans
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-blue-900 transition hover:bg-amber-200 sm:w-auto"
                >
                  Try free — 50 credits, 7 days
                </Link>
                <Link
                  href="/ai/pricing"
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
                >
                  See plans
                </Link>
              </>
            )}
          </div>

          <p className="mt-3 text-[11px] text-white/75">
            ⏱ Subscription credits valid 365 days · 🔒 No card stored on file · ↩ 7-day refund
          </p>
        </div>

        <AiPromptDemo />
      </div>
    </section>
  );
}
