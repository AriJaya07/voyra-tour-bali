"use client";

import Link from "next/link";
import { useEstimateCost } from "@/utils/hooks/useAiWallet";
import type { AiCostEndpoint } from "@/utils/service/ai.service";

interface Props {
  endpoint: AiCostEndpoint;
  /** Optional dynamic params (e.g. `days` for plan endpoint). */
  params?: { days?: number };
  /** Extra Tailwind classes for layout. */
  className?: string;
  /** Render the pill only when ok=false (out of credits). */
  showOnlyWhenLow?: boolean;
}

/**
 * Live "Cost: X · You have Y" pill. Re-fetches estimate from
 * /api/ai/preview-cost so server stays the source of truth (free-for-traveler
 * checks, plan-day surcharges, kill switch).
 */
export default function CostPill({ endpoint, params, className = "", showOnlyWhenLow = false }: Props) {
  const q = useEstimateCost(endpoint, params, true);

  if (q.isLoading || !q.data) {
    return showOnlyWhenLow ? null : (
      <span className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400 ${className}`}>
        Estimating cost…
      </span>
    );
  }

  const { credits, balance, ok, freeForTraveler } = q.data;

  if (showOnlyWhenLow && ok) return null;

  if (freeForTraveler) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ${className}`}>
        ✓ Free during your trip
      </span>
    );
  }

  if (!ok) {
    return (
      <Link
        href="/ai/pricing"
        className={`inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 ${className}`}
      >
        Need {credits} credits · Top up →
      </Link>
    );
  }

  const tone = balance < credits * 3 ? "amber" : "blue";
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls} ${className}`}
      title={`Costs ${credits} credits — you have ${balance}`}
    >
      <span>Cost: {credits}</span>
      <span className="opacity-60">·</span>
      <span>{balance} left</span>
    </span>
  );
}
