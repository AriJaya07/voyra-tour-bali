"use client";

import { HiSparkles } from "react-icons/hi2";
import type { AiPlan } from "@/utils/service/ai.service";

interface Props {
  plan: AiPlan;
  current?: boolean;
  onSelect?: (plan: AiPlan) => void;
  busy?: boolean;
}

const FEATURE_LABELS: Array<{ key: keyof AiPlan["features"]; label: string }> = [
  { key: "plan", label: "AI itinerary planner" },
  { key: "planMaxDays", label: "Days per plan" },
  { key: "saveItineraries", label: "Saved itineraries" },
  { key: "concierge", label: "AI concierge with memory" },
  { key: "dayOfTrip", label: "Day-of-trip assistant" },
  { key: "cultural", label: "Cultural co-pilot" },
  { key: "voucherRead", label: "Voucher reader (vision)" },
  { key: "familySeats", label: "Family seats" },
  { key: "priorityRouting", label: "Priority AI routing" },
];

function renderValue(v: AiPlan["features"][keyof AiPlan["features"]]) {
  if (typeof v === "boolean") return v ? "Included" : "—";
  if (v === 0) return "—";
  if (v >= 999) return "Unlimited";
  return String(v);
}

export default function PlanCard({ plan, current, onSelect, busy }: Props) {
  const isFree = plan.priceIdr === 0;
  const featured = plan.key === "VOYAGER";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 shadow-sm transition
        ${featured ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-300" : "border-slate-200 bg-white"}
        ${current ? "ring-2 ring-emerald-400" : ""}`}
    >
      <div className="flex items-center gap-2">
        <HiSparkles className="h-4 w-4 text-blue-500" />
        <h3 className="text-lg font-semibold text-slate-900">{plan.label}</h3>
        {current ? (
          <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Current
          </span>
        ) : featured ? (
          <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Most popular
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">
          {isFree ? "Free" : `Rp ${plan.priceIdr.toLocaleString("id-ID")}`}
        </span>
        {!isFree ? <span className="text-sm text-slate-500">/month</span> : null}
      </div>

      <div className="mt-1 text-sm text-slate-600">
        {plan.monthlyCredits.toLocaleString()} credits / month
      </div>

      <ul className="mt-5 space-y-2 text-sm">
        {FEATURE_LABELS.map((f) => {
          const value = plan.features[f.key];
          const enabled = typeof value === "boolean" ? value : value > 0;
          return (
            <li key={f.key} className="flex items-start justify-between gap-3">
              <span className={enabled ? "text-slate-800" : "text-slate-400"}>
                {f.label}
              </span>
              <span
                className={`text-right font-medium ${enabled ? "text-slate-900" : "text-slate-400"}`}
              >
                {renderValue(value)}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onSelect?.(plan)}
        disabled={current || busy || isFree}
        className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed
          ${current
            ? "bg-emerald-50 text-emerald-700"
            : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"}`}
      >
        {isFree
          ? "Default plan"
          : current
          ? "You're on this plan"
          : busy
          ? "Opening payment…"
          : "Choose plan"}
      </button>
    </div>
  );
}
