"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";

interface Suggestion {
  day: number;
  itemTitle: string;
  action: "swap" | "remove";
  reason: string;
  estSavingUsd: number;
}

interface BudgetResponse {
  estimatedTotalUsd: number;
  estimatedTotalIdr: number;
  targetIdr: number | null;
  overBudget: boolean;
  advice: string;
  suggestions: Suggestion[];
  rateNote: string;
  error?: string;
}

const COST = AI_ENDPOINT_COST.budget; // 4

/**
 * IDR Budget Optimizer control (Feature 4). Lets the traveller set a target
 * budget; AI proposes swaps/removals to fit. Read-only — the user applies
 * changes through the existing Refine panel below it.
 */
export default function BudgetOptimizer({ itineraryId }: { itineraryId: number }) {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BudgetResponse | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const targetIdr = target.replace(/[^\d]/g, "");
      const res = await fetch("/api/ai/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itineraryId,
          targetIdr: targetIdr ? Number(targetIdr) : undefined,
        }),
      });
      if (res.status === 402) {
        toast.error("Out of AI credits — top up to use the budget optimizer.");
        return;
      }
      const data = (await res.json()) as BudgetResponse;
      if (!res.ok) {
        toast.error(data.error || "Budget optimizer failed.");
        return;
      }
      setResult(data);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Fit to budget (AI)</p>
        <span className="text-[10px] font-semibold text-amber-500">{COST} credits</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
          <input
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target, e.g. 5.000.000"
            className="w-full rounded-lg border border-amber-200 bg-white pl-7 pr-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 active:scale-95 transition disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Optimize"}
        </button>
      </div>

      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">Est. activities:</span>
            <span className="font-bold text-gray-900">≈ Rp {result.estimatedTotalIdr.toLocaleString()}</span>
            {result.targetIdr != null && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  result.overBudget ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}
              >
                {result.overBudget ? "Over target" : "Within target"}
              </span>
            )}
          </div>

          {result.advice && <p className="text-xs text-gray-700 leading-relaxed">{result.advice}</p>}

          {result.suggestions.length > 0 && (
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="rounded-lg border border-gray-100 bg-white p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      <span
                        className={`mr-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          s.action === "remove" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {s.action}
                      </span>
                      Day {s.day}: {s.itemTitle}
                    </span>
                    {s.estSavingUsd > 0 && (
                      <span className="whitespace-nowrap font-bold text-green-600">
                        −Rp {Math.round(s.estSavingUsd * 16450).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-gray-500 leading-snug">{s.reason}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-gray-400 leading-snug">{result.rateNote} Apply changes with the day tools below.</p>
        </div>
      )}
    </div>
  );
}
