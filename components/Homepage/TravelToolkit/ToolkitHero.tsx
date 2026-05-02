import Link from "next/link";
import LightningIcon from "@/components/assets/Icon/shared/LightningIcon";

interface Props {
  authed: boolean;
  hasNextEvent: boolean;
  nextEventTitle?: string | null;
  nextEventDate?: string | null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ToolkitHero({
  authed,
  hasNextEvent,
  nextEventTitle,
  nextEventDate,
}: Props) {
  const subtitle = authed
    ? hasNextEvent
      ? `Up next: ${nextEventTitle} · ${formatDate(nextEventDate)}`
      : "Build a 5-day itinerary in 30 seconds — bookable tours + local tips."
    : "Build a 5-day itinerary in 30 seconds — bookable tours + local tips.";

  const ctaHref = authed ? "/plan" : "/login?callbackUrl=%2Fplan";
  const ctaLabel = authed ? "Build my itinerary" : "Sign in to plan";

  return (
    <Link
      href={ctaHref}
      data-toolkit-tile="ai-planner-hero"
      className="group relative block sm:col-span-2 sm:row-span-2 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0071CE] via-[#0061b5] to-[#1d3fa6] text-white p-6 sm:p-8 transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/banner-travel.png')] bg-cover bg-center pointer-events-none transition group-hover:scale-105 motion-reduce:group-hover:scale-100"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/55 via-[#0061b5]/45 to-[#1d3fa6]/60 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a2a55]/75 via-[#0a2a55]/30 to-transparent pointer-events-none"
      />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full min-h-[180px]">
        <span className="inline-flex items-center gap-1.5 self-start bg-white/15 border border-white/25 text-blue-50 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          <LightningIcon className="w-3 h-3" />
          AI Trip Planner
        </span>
        <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
          Plan your perfect Bali week
        </h2>
        <p className="text-sm sm:text-base text-blue-50 max-w-md leading-relaxed">{subtitle}</p>
        <div className="flex-1" />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 bg-white text-[#0071CE] font-bold text-sm px-5 py-2.5 rounded-full shadow-sm group-hover:bg-blue-50 transition">
            ✨ {ctaLabel}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
          <span className="text-[11px] text-blue-100">
            Free · personalised · book in one tap
          </span>
        </div>
      </div>
    </Link>
  );
}
