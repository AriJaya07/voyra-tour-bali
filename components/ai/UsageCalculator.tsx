"use client";

import { useMemo, useState } from "react";
import { translateCredits } from "@/lib/config/aiPlans";

const CHAT_COST = 2;
const PLAN_COST = 8;
const CONCIERGE_COST = 4;

interface UsagePick {
  chats: number;
  plans: number;
  concierge: number;
}

interface PlanPick {
  key: string;
  label: string;
  priceIdr: number;
  monthlyCredits: number;
}

const RECOMMENDED: PlanPick[] = [
  { key: "FREE", label: "Free", priceIdr: 0, monthlyCredits: 20 },
  { key: "EXPLORER", label: "Explorer", priceIdr: 49_000, monthlyCredits: 300 },
  { key: "VOYAGER", label: "Voyager", priceIdr: 129_000, monthlyCredits: 1_000 },
  { key: "FOUNDER", label: "Founder", priceIdr: 299_000, monthlyCredits: 3_000 },
];

function recommend(monthlyCredits: number): PlanPick {
  for (const p of RECOMMENDED) {
    if (p.monthlyCredits >= monthlyCredits) return p;
  }
  return RECOMMENDED[RECOMMENDED.length - 1]!;
}

/**
 * Plan recommender slider — drag the dials, see which plan covers you.
 * Sits on /plans + /profile/ai. Pure client; no API dependency.
 */
export default function UsageCalculator({ className = "" }: { className?: string }) {
  const [picks, setPicks] = useState<UsagePick>({ chats: 30, plans: 4, concierge: 8 });
  const monthly = picks.chats * CHAT_COST + picks.plans * PLAN_COST + picks.concierge * CONCIERGE_COST;
  const rec = useMemo(() => recommend(monthly), [monthly]);
  const t = translateCredits(rec.monthlyCredits);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="text-base font-semibold text-slate-900">How much will I use?</h3>
      <p className="mt-1 text-xs text-slate-500">
        Estimate your monthly AI activity. We&apos;ll suggest the right plan.
      </p>

      <div className="mt-4 space-y-3">
        <Slider
          label="Chat turns"
          help={`${CHAT_COST} credits each`}
          value={picks.chats}
          min={0}
          max={150}
          step={5}
          onChange={(v) => setPicks((p) => ({ ...p, chats: v }))}
        />
        <Slider
          label="Itinerary plans"
          help={`${PLAN_COST} credits each (≤7 days)`}
          value={picks.plans}
          min={0}
          max={30}
          step={1}
          onChange={(v) => setPicks((p) => ({ ...p, plans: v }))}
        />
        <Slider
          label="Concierge turns"
          help={`${CONCIERGE_COST} credits each (Voyager+)`}
          value={picks.concierge}
          min={0}
          max={60}
          step={2}
          onChange={(v) => setPicks((p) => ({ ...p, concierge: v }))}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-blue-50 p-4 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase text-blue-700">Estimated monthly</div>
          <div className="text-2xl font-bold tabular-nums text-blue-900">
            {monthly.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700">credits used</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-blue-700">Recommended plan</div>
          <div className="text-2xl font-bold text-blue-900">{rec.label}</div>
          <div className="text-xs text-blue-700">
            {rec.priceIdr === 0 ? "Free" : `Rp ${rec.priceIdr.toLocaleString("id-ID")}/mo`}
            {" · "}
            {rec.monthlyCredits.toLocaleString()} credits/mo
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Recommended plan covers your usage with headroom. {t.chatTurns} chats / {t.quickPlans}{" "}
        plans / {t.conciergeTurns} concierge turns possible per month at {rec.label}.
      </p>
    </section>
  );
}

interface SliderProps {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, help, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="font-mono tabular-nums text-slate-900">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-blue-600"
      />
      <div className="text-[10px] text-slate-500">{help}</div>
    </label>
  );
}
