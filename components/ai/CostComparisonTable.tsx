"use client";

import { COMPARISON_ROWS } from "@/lib/config/aiCopy";

interface Props {
  className?: string;
}

const renderCell = (v: string | true | false) => {
  if (v === true) return <span className="text-emerald-600 font-bold">✓</span>;
  if (v === false) return <span className="text-slate-300">✗</span>;
  return <span className="text-slate-700">{v}</span>;
};

/**
 * Voyra vs ChatGPT Plus vs generic LLM comparison table. Pure presentational
 * component reading from `lib/config/aiCopy.ts`.
 */
export default function CostComparisonTable({ className = "" }: Props) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-slate-900">Why Voyra AI</h2>
      <p className="mt-1 text-xs text-slate-500">
        Built specifically for Bali planning — not a general chatbot wearing a hat.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2"></th>
              <th className="px-2 py-2 text-blue-700">Voyra AI</th>
              <th className="px-2 py-2">ChatGPT Plus</th>
              <th className="px-2 py-2">Generic LLM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label}>
                <td className="px-2 py-2 font-medium text-slate-800">{row.label}</td>
                <td className="px-2 py-2">{renderCell(row.voyra)}</td>
                <td className="px-2 py-2">{renderCell(row.chatgpt)}</td>
                <td className="px-2 py-2">{renderCell(row.generic)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
