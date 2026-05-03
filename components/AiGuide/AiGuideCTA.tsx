import Link from "next/link";
import { HiSparkles } from "react-icons/hi2";

interface Props {
  authed: boolean;
}

/**
 * Closing banner on the AI guide page. Directs guests to register, signed-in
 * users to the AI tools index. Compact so the page flows past it without
 * feeling like a hard sell.
 */
export default function AiGuideCTA({ authed }: Props) {
  return (
    <section
      aria-label="Get started with Voyra AI"
      className="relative overflow-hidden my-10 sm:my-14 rounded-3xl bg-slate-900 p-6 sm:p-10 text-white shadow-lg"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/banner/sub-banner-ai.png')] bg-cover bg-center pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/80 via-[#1d3a78]/70 to-[#1d3fa6]/85 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a2a55]/70 via-[#0a2a55]/25 to-transparent pointer-events-none"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90 ring-1 ring-white/20">
            <HiSparkles className="h-3.5 w-3.5" /> Ready when you are
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-black leading-tight">
            {authed
              ? "Open your AI tools and start planning"
              : "Sign up free and try every tool with 50 credits"}
          </h2>
          <p className="mt-2 text-sm text-blue-50/90 leading-relaxed">
            {authed
              ? "Itinerary planner, concierge, cultural co-pilot — all credit-only, no plan upgrade required."
              : "7-day welcome bonus, no card required, refund window on every paid plan."}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
          {authed ? (
            <>
              <Link
                href="/profile/ai/tools"
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-amber-100 sm:w-auto"
              >
                Open AI tools →
              </Link>
              <Link
                href="/plans"
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
                Create free account →
              </Link>
              <Link
                href="/plans"
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
              >
                See plans
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
