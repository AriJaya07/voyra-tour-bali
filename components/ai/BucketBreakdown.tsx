"use client";

import { BUCKET_TOKENS } from "@/lib/config/aiUiTokens";
import type { CreditBucket } from "@/utils/service/ai.service";

interface Props {
  buckets: CreditBucket[];
  className?: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

/**
 * Transparent per-bucket credit display used on /profile/ai. Each row groups
 * grants by source, shows total + soonest expiry + per-grant detail. Spend
 * order is oldest-expiry first across all buckets — surfaced via the
 * "spent first" arrow at the top.
 */
export default function BucketBreakdown({ buckets, className = "" }: Props) {
  if (buckets.length === 0) {
    return (
      <section className={`rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 shadow-sm ${className}`}>
        No active credits yet. Top up or subscribe to fill your wallet.
      </section>
    );
  }

  // Display in spend order (oldest expiry first by aggregating soonest per bucket).
  const ordered = [...buckets].sort((a, b) => {
    if (!a.soonestExpiry) return 1;
    if (!b.soonestExpiry) return -1;
    return a.soonestExpiry.localeCompare(b.soonestExpiry);
  });

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Credit breakdown</h2>
        <span className="text-[11px] text-slate-500">
          ↓ spent first (oldest expiry) · spent last ↓
        </span>
      </header>

      <ul className="mt-3 space-y-3">
        {ordered.map((b) => {
          const tok = BUCKET_TOKENS[b.source];
          const usedPct =
            b.grants.length > 0
              ? Math.round(
                  ((b.grants.reduce((acc, g) => acc + (g.amount - g.remaining), 0)) /
                    Math.max(1, b.grants.reduce((acc, g) => acc + g.amount, 0))) *
                    100
                )
              : 0;

          return (
            <li
              key={b.source}
              className={`rounded-xl border border-slate-200 p-3 ring-1 ring-inset ${tok.ringClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${tok.pillClass}`}>
                    {tok.emoji} {tok.labelShort}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{b.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900 tabular-nums">
                    {b.totalRemaining.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {b.soonestExpiry ? `Expires ${fmtDate(b.soonestExpiry)}` : "No expiry"}
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-600">{b.description}</p>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${tok.barClass}`}
                  style={{ width: `${100 - usedPct}%` }}
                  aria-label={`${100 - usedPct}% remaining`}
                />
              </div>

              {b.grants.length > 1 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
                    {b.grants.length} grants — show breakdown
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {b.grants.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-baseline justify-between gap-2 text-[11px] text-slate-500"
                      >
                        <span>
                          {g.remaining}/{g.amount} · granted {fmtDate(g.grantedAt)}
                        </span>
                        <span>
                          {g.daysToExpiry === 0 ? "expires today" : `${g.daysToExpiry}d left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-slate-500">
        Credits with the soonest expiry are spent first. This protects your
        long-lived top-up + subscription credits from being wasted.
      </p>
    </section>
  );
}
