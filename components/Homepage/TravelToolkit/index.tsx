"use client";

import { useSession } from "next-auth/react";
import {
  CalendarIcon,
  ClipboardIcon,
  MapPinIcon,
} from "@/components/assets/Icon/shared";
import { HiSparkles } from "react-icons/hi2";

const PLAN_LABELS: Record<"FREE" | "EXPLORER" | "VOYAGER" | "FOUNDER", string> = {
  FREE: "Free",
  EXPLORER: "Explorer",
  VOYAGER: "Voyager",
  FOUNDER: "Founder",
};
import ToolkitTile from "./ToolkitTile";
import ToolkitHero from "./ToolkitHero";
import ToolkitFooterCTA from "./ToolkitFooterCTA";
import { useToolkitData } from "@/utils/hooks/useToolkitData";

function authedHref(authed: boolean, target: string) {
  if (authed) return target;
  return `/login?callbackUrl=${encodeURIComponent(target)}`;
}

export default function TravelToolkit() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const { data, loading } = useToolkitData(authed);

  const upcomingLabel = data.upcomingEvents > 0
    ? `${data.upcomingEvents} this week`
    : "Plan a day";

  return (
    <section
      aria-labelledby="travel-toolkit-heading"
      className="my-10 sm:my-14 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
    >
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE] mb-1">
            Your travel toolkit
          </p>
          <h2
            id="travel-toolkit-heading"
            className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
          >
            {authed ? "Pick up where you left off" : "Travel smarter with Voyra"}
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl leading-relaxed">
            {authed
              ? "Plans, reminders, saved tours and notes — one tap away from your next adventure."
              : "Sign in to plan trips with AI, save what you love, and remember every Bali moment."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ToolkitHero
          authed={authed}
          hasNextEvent={!!data.nextEvent}
          nextEventTitle={data.nextEvent?.title ?? null}
          nextEventDate={data.nextEvent?.date ?? null}
        />

        <ToolkitTile
          href={authedHref(authed, "/trips/calendar")}
          title="Trip Calendar"
          description={
            authed
              ? data.upcomingEvents > 0
                ? "See bookings, itineraries and your own events on one calendar."
                : "Build a day-by-day plan with bookings and notes in one view."
              : "Track every tour, festival, and event — all in one calendar."
          }
          badge={authed ? upcomingLabel : null}
          icon={<CalendarIcon className="w-5 h-5" />}
          accent="sky"
          ariaLabel={`Trip Calendar${
            authed && data.upcomingEvents > 0 ? `, ${data.upcomingEvents} events this week` : ""
          }, opens calendar`}
        />

        <ToolkitTile
          href="/ai/pricing"
          title="AI Subscription"
          description={
            authed
              ? data.aiPlan && data.aiPlan !== "FREE"
                ? `You're on ${PLAN_LABELS[data.aiPlan]} — ${(data.aiCreditsRemaining ?? 0).toLocaleString()} credits ready.`
                : `${(data.aiCreditsRemaining ?? 0).toLocaleString()} credits left. Subscribe for monthly top-ups + cheaper credits.`
              : "Monthly AI credits, family seats, premium concierge — pick a plan to fit your trip."
          }
          badge={authed && data.aiPlan ? PLAN_LABELS[data.aiPlan] : "Subscribe"}
          badgeTone={authed && data.aiPlan && data.aiPlan !== "FREE" ? "success" : "default"}
          icon={<HiSparkles className="w-5 h-5" />}
          accent="violet"
          ariaLabel="AI Subscription plans, opens pricing page"
        />

        <ToolkitTile
          href={authedHref(authed, "/profile/notes")}
          title="Bali Notes"
          description={
            authed
              ? data.notesCount > 0
                ? "Your reviews, tips and memories. Optionally pin to a date."
                : "Capture a memory, tip or lesson learned from Bali."
              : "Capture every Bali tip, review, and memory. Share what's worth sharing."
          }
          badge={authed && data.notesCount > 0 ? data.notesCount : null}
          icon={<ClipboardIcon className="w-5 h-5" />}
          accent="emerald"
        />

        <ToolkitTile
          href={authedHref(authed, "/trips")}
          title="Saved Itineraries"
          description={
            authed
              ? data.itineraryCount > 0
                ? "Your AI-generated plans — view, edit, share with friends."
                : "Build an AI plan and save it for the next trip."
              : "Save AI plans, share them with travel buddies, book in one tap."
          }
          badge={authed && data.itineraryCount > 0 ? data.itineraryCount : null}
          icon={<MapPinIcon className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <ToolkitFooterCTA
          authed={authed}
          loyaltyPoints={data.loyaltyPoints}
          loyaltyTier={data.loyaltyTier ?? null}
        />
      </div>

      {loading && authed && (
        <p className="sr-only" role="status">
          Loading your toolkit…
        </p>
      )}
    </section>
  );
}
