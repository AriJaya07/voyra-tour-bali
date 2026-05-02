"use client";

import { FAQ_ITEMS } from "@/lib/config/aiCopy";

interface Props {
  className?: string;
}

/**
 * Plain `<details>` accordion — no JS state needed; semantic + accessible.
 * Source of truth for the questions is `lib/config/aiCopy.ts`.
 */
export default function PlansFAQ({ className = "" }: Props) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-slate-900">Frequently asked</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="group py-3">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-800 marker:hidden">
              <span>{item.q}</span>
              <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
