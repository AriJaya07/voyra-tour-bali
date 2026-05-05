import Link from "next/link";
import type { BaliNoteFallbackItem } from "./types";

interface Props {
  notes: BaliNoteFallbackItem[];
  filterReason?: string;
  resetHref?: string;
}

export default function EmptyStateAi({ notes, filterReason, resetHref }: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-[1.1fr_1fr] items-stretch">
      <div className="rounded-3xl bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white p-7 sm:p-9 shadow-md">
        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-100">No guide?</p>
        <h2 className="text-xl sm:text-2xl font-black mt-1 mb-2">Build one with AI</h2>
        <p className="text-sm text-blue-50 leading-relaxed mb-5">
          {filterReason
            ? `No guide matched "${filterReason}". Generate a tailored day-by-day plan instead.`
            : "Long-form guides are still being written. Skip ahead — the AI builds a plan in 30 seconds."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ai/plan"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-[#0071CE] text-sm font-bold rounded-xl hover:bg-amber-100 transition"
          >
            ✨ Plan my Bali trip
          </Link>
          {resetHref && (
            <Link
              href={resetHref}
              className="inline-flex items-center px-4 py-2.5 border border-white/30 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition"
            >
              Clear filters
            </Link>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">Live from travelers</p>
          <h3 className="text-base font-black text-gray-900 mb-4">Recent traveler notes</h3>
          <ul className="space-y-3">
            {notes.slice(0, 3).map((n) => (
              <li key={n.id} className="rounded-xl bg-gray-50 p-3">
                <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                  {n.targetTitle ?? n.targetType}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.body}</p>
                {n.rating != null && (
                  <p className="text-[11px] text-amber-600 mt-1">{"★".repeat(n.rating)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
