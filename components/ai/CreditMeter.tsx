"use client";

import { useMemo } from "react";

interface Props {
  balance: number;
  earned: number;
  expiringIn7d: number;
  planLabel: string;
}

/**
 * Header for the AI wallet page: balance, plan, and a thin progress bar.
 */
export default function CreditMeter({ balance, earned, expiringIn7d, planLabel }: Props) {
  const pct = useMemo(() => {
    if (earned <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((balance / earned) * 100)));
  }, [balance, earned]);

  const barColor =
    pct >= 60 ? "bg-emerald-500" : pct >= 25 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your AI Balance
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{balance.toLocaleString()}</span>
            <span className="text-sm text-slate-500">credits</span>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {planLabel}
        </span>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{pct}% of earned remaining</span>
          {expiringIn7d > 0 ? (
            <span className="font-medium text-amber-600">
              {expiringIn7d.toLocaleString()} expire in 7 days
            </span>
          ) : (
            <span>No upcoming expiries</span>
          )}
        </div>
      </div>
    </div>
  );
}
