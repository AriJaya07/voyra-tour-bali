"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HiSparkles } from "react-icons/hi2";
import { useItineraryBookMutation } from "@/utils/hooks/useAiWallet";
import type { AiItineraryBundle } from "@/utils/service/ai.service";

interface Props {
  itineraryId: number;
  /** When set, only items from a single day are bundled. */
  dayFilter?: number;
  className?: string;
}

/**
 * Subscriber-only "Book all tours" CTA. Calls /api/ai/itinerary/book and
 * renders the resulting bundle (Viator deep-links — final price set at
 * Viator checkout). Handles the 402 FEATURE_LOCKED case by linking to /ai/pricing.
 */
export default function BookFromItineraryButton({
  itineraryId,
  dayFilter,
  className = "",
}: Props) {
  const [bundle, setBundle] = useState<AiItineraryBundle | null>(null);
  const [open, setOpen] = useState(false);
  const mut = useItineraryBookMutation();

  async function handleClick() {
    try {
      const res = await mut.mutateAsync({ itineraryId, dayFilter });
      setBundle(res);
      setOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bundle failed";
      if (msg.includes("Locked") || msg.includes("subscribers")) {
        toast.error(msg, {
          action: {
            label: "Plans",
            onClick: () => (window.location.href = "/ai/pricing"),
          },
        });
      } else {
        toast.error(msg);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={mut.isPending}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <HiSparkles className="h-4 w-4" />
        {mut.isPending ? "Preparing tours…" : "Book all tours"}
      </button>

      {open && bundle ? (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/55 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bundle-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl"
                >
                  ✨
                </div>
                <div className="min-w-0">
                  <h3 id="bundle-title" className="text-base font-bold text-slate-900 leading-tight">
                    Your bundle is ready
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    {bundle.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {/* Items list */}
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {bundle.bundle.length} {bundle.bundle.length === 1 ? "tour" : "tours"} ready to book
              </p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
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
                        {b.originalPrice != null ? (
                          <div className="mt-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              From ${b.originalPrice}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      {b.href ? (
                        <Link
                          href={b.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#0071CE] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ba6] transition shadow-sm"
                        >
                          Book
                          <span aria-hidden>↗</span>
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {/* Estimated total — Viator pricing applies at checkout */}
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

              {/* Footer note */}
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Tap <strong>Book</strong> on each tour to complete payment on Viator. We&apos;ve also
                saved everything to your{" "}
                <Link
                  href="/trips"
                  className="font-semibold text-[#0071CE] hover:underline"
                >
                  My Trips
                </Link>{" "}
                so you can come back to it anytime.
              </p>
            </div>

          </div>
        </div>
      ) : null}
    </>
  );
}
