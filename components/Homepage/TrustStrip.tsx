"use client";

import { TRUST_BULLETS } from "@/lib/config/aiCopy";

interface Props {
  className?: string;
  /** Render compact (single row, no description). */
  compact?: boolean;
}

/**
 * Reusable transparency strip used on Homepage, /plans, /profile/ai.
 * Single source of truth for the trust bullets is `lib/config/aiCopy.ts`.
 */
export default function TrustStrip({ className = "", compact = false }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-xs text-slate-600 backdrop-blur ${className}`}
      role="note"
      aria-label="Trust and transparency"
    >
      {TRUST_BULLETS.map((b) => (
        <span key={b.text} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={compact ? "text-sm" : "text-base"}>
            {b.icon}
          </span>
          <span className={compact ? "" : "font-medium"}>{b.text}</span>
        </span>
      ))}
    </div>
  );
}
