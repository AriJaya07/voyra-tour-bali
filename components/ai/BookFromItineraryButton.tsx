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
 * Subscriber-only "Book everything" CTA. Calls /api/ai/itinerary/book and
 * renders the resulting bundle (Viator deep-links + 5% promo). Handles the
 * 402 FEATURE_LOCKED case by linking to /plans.
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
            onClick: () => (window.location.href = "/plans"),
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
        {mut.isPending ? "Building bundle…" : "Book everything (5% off)"}
      </button>

      {open && bundle ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {bundle.title} — bundle ready
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Promo <span className="font-mono">{bundle.promoCode}</span> applied
                  ({(bundle.promoDiscount * 100).toFixed(0)}% off)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {bundle.bundle.map((b) => (
                <li key={b.productCode} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{b.title}</div>
                    <div className="text-xs text-slate-500">
                      Day {b.day ?? "?"} · {b.slot ?? "any"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {b.discountedPrice != null ? (
                      <div className="text-right text-xs">
                        <div className="font-mono text-slate-400 line-through">
                          ${b.originalPrice}
                        </div>
                        <div className="font-mono font-semibold text-emerald-600">
                          ${b.discountedPrice}
                        </div>
                      </div>
                    ) : null}
                    {b.href ? (
                      <Link
                        href={b.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white hover:bg-blue-700"
                      >
                        Book →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              You save <strong>${bundle.totals.savings}</strong> with the bundle.
              <br />
              Total {bundle.totals.currency} ${bundle.totals.afterPromo} (was $
              {bundle.totals.original}).
            </div>

            <p className="mt-3 text-xs text-slate-500">
              These items have also been added to your{" "}
              <Link href="/profile/itineraries" className="text-blue-600 underline">
                imported trips
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
