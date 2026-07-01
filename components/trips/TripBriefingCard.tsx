"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTripBriefingMutation } from "@/utils/hooks/useAiWallet";
import type { AiTripBriefingResponse } from "@/utils/service/ai.service";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function TripBriefingCard() {
  const briefing = useTripBriefingMutation();
  const [data, setData] = useState<AiTripBriefingResponse | null>(null);
  const [noTrip, setNoTrip] = useState(false);

  const generate = async () => {
    setNoTrip(false);
    try {
      const res = await briefing.mutateAsync(undefined);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Briefing unavailable";
      if (/no upcoming/i.test(msg)) {
        setNoTrip(true);
        return;
      }
      const lowCredits = /credit/i.test(msg);
      toast.error(msg, {
        description: lowCredits ? "Top up to generate your briefing." : undefined,
        action: lowCredits ? { label: "Get credits", onClick: () => (window.location.href = "/ai/pricing") } : undefined,
      });
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            🧭 Pre-Trip Briefing
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            AI-prepped for your next confirmed tour — cultural events, closures & a packing checklist.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={briefing.isPending}
          className="shrink-0 rounded-lg bg-[#0071CE] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#005ba6] disabled:opacity-60"
        >
          {briefing.isPending ? "Preparing…" : data ? "Refresh briefing" : "Generate briefing · 3 credits"}
        </button>
      </div>

      {noTrip && (
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-gray-500">
          No upcoming confirmed booking yet. Book a tour and your briefing will appear here.
        </p>
      )}

      {data && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0071CE]">
              {data.booking.productTitle} · {fmt(data.booking.travelDate)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{data.briefing}</p>
          </div>

          {data.events.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Cultural events near your dates</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {data.events.map((e) => (
                  <li key={e.slug} className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-xs text-amber-700">
                      {new Date(e.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      {e.region ? ` · ${e.region}` : ""}
                    </span>
                    {e.impact && <span className="w-full text-xs text-amber-700">⚠ {e.impact}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.checklist.length > 0 && (
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prep checklist</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {data.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-[#0071CE]">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
