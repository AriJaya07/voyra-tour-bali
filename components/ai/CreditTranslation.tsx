"use client";

import { translateCredits } from "@/lib/config/aiPlans";

interface Props {
  amount: number;
  /** "compact" = inline ("≈ 25 chats · 6 plans"), "full" = list of 6 items. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Translates a raw credit amount into human-readable AI activities. Used on
 * plan cards, top-up cards, hero, profile bucket breakdown.
 */
export default function CreditTranslation({ amount, variant = "compact", className = "" }: Props) {
  const t = translateCredits(amount);

  if (variant === "compact") {
    const bits = [
      t.chatTurns > 0 ? `${t.chatTurns} chats` : null,
      t.quickPlans > 0 ? `${t.quickPlans} plans` : null,
      t.conciergeTurns > 0 ? `${t.conciergeTurns} concierge` : null,
      t.voucherReads > 0 ? `${t.voucherReads} voucher reads` : null,
    ].filter(Boolean);
    return (
      <span className={`text-xs text-slate-600 ${className}`}>
        ≈ {bits.slice(0, 3).join(" · ") || "small task"}
      </span>
    );
  }

  const rows: { label: string; value: number }[] = [
    { label: "Chat turns", value: t.chatTurns },
    { label: "Itinerary plans (≤7 days)", value: t.quickPlans },
    { label: "Itinerary plans (8–14 days)", value: t.longPlans },
    { label: "Plan refines", value: t.refines },
    { label: "Concierge turns (memory)", value: t.conciergeTurns },
    { label: "Cultural questions", value: t.culturalTurns },
    { label: "Day-of-trip helps", value: t.dayOfTripTurns },
    { label: "Voucher reads (vision)", value: t.voucherReads },
  ];

  return (
    <ul className={`mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 ${className}`}>
      {rows.map((r) => (
        <li key={r.label} className="flex items-baseline justify-between gap-2">
          <span>{r.label}</span>
          <span className="font-mono font-semibold tabular-nums text-slate-800">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
