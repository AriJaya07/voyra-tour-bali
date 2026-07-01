"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAiWallet, usePlanRefineMutation } from "@/utils/hooks/useAiWallet";
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";
import SpendConfirmDialog from "@/components/ai/SpendConfirmDialog";

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode: string | null;
  title: string;
  source: "viator" | "tip" | "free";
  notes?: string;
  href?: string | null;
  price?: number | null;
  rating?: number | null;
}

const REFINE_COST = AI_ENDPOINT_COST.plan_refine; // 6

const SLOT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };
const SLOT_LABEL: Record<string, string> = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌙 Evening" };

const QUICK_CHIPS = [
  "Less driving",
  "More food",
  "More relaxed",
  "Cheaper options",
  "More adventure",
  "More culture",
];

export default function ItineraryRefinePanel({ itineraryId }: { itineraryId: number }) {
  const wallet = useAiWallet({ enabled: true });
  const refine = usePlanRefineMutation();

  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<{ day: number; instruction: string } | null>(null);
  const [lastRefinedDay, setLastRefinedDay] = useState<number | null>(null);

  // Load this itinerary's day-by-day items on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/itineraries/${itineraryId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load this itinerary");
        const data = await res.json();
        if (cancelled) return;
        const raw = Array.isArray(data?.itemsJson) ? (data.itemsJson as PlanItem[]) : [];
        setItems(raw);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load itinerary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itineraryId]);

  // Group items into ordered days.
  const days = useMemo(() => {
    if (!items) return [];
    const byDay = new Map<number, PlanItem[]>();
    for (const it of items) {
      if (!byDay.has(it.day)) byDay.set(it.day, []);
      byDay.get(it.day)!.push(it);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, list]) => ({
        day,
        items: [...list].sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9)),
      }));
  }, [items]);

  const balance = wallet.data?.balance ?? 0;

  const requestRefine = (day: number) => {
    const instruction = (drafts[day] ?? "").trim();
    if (!instruction) {
      toast.error("Tell us how to change this day first (e.g. \"more food\").");
      return;
    }
    setPending({ day, instruction });
  };

  const confirmRefine = async () => {
    if (!pending) return;
    try {
      const res = await refine.mutateAsync({
        itineraryId,
        day: pending.day,
        instruction: pending.instruction,
      });
      setItems(res.items as PlanItem[]);
      setLastRefinedDay(pending.day);
      setDrafts((d) => ({ ...d, [pending.day]: "" }));
      toast.success(`Day ${pending.day} refined`, {
        description: "Your saved itinerary was updated.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refine failed";
      const lowCredits = /credit/i.test(msg);
      toast.error(msg, {
        description: lowCredits ? "Top up your AI credits to keep refining." : undefined,
        action: lowCredits
          ? { label: "Get credits", onClick: () => (window.location.href = "/ai/pricing") }
          : undefined,
      });
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-16 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!days.length) {
    return (
      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
        This itinerary has no day items to refine.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Refine with AI</p>
        <span className="text-[11px] font-semibold text-gray-400">
          {REFINE_COST} credits / day · balance {balance}
        </span>
      </div>

      <div className="mt-3 space-y-4">
        {days.map(({ day, items: dayItems }) => (
          <div
            key={day}
            className={`rounded-xl border bg-white p-3 transition ${
              lastRefinedDay === day ? "border-[#0071CE] ring-1 ring-[#0071CE]/20" : "border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">Day {day}</h4>
              {lastRefinedDay === day && (
                <span className="text-[10px] font-bold uppercase text-[#0071CE]">Updated</span>
              )}
            </div>

            <ul className="mt-2 space-y-1.5">
              {dayItems.map((it, i) => (
                <li key={`${day}-${it.slot}-${i}`} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="shrink-0 font-semibold text-gray-400">{SLOT_LABEL[it.slot] ?? it.slot}</span>
                  <span className="min-w-0">
                    {it.href ? (
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-[#0071CE] hover:underline"
                      >
                        {it.title}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-800">{it.title}</span>
                    )}
                    {typeof it.price === "number" && it.price > 0 && (
                      <span className="ml-1 text-gray-400">· from ${it.price}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {/* Refine controls */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDrafts((d) => ({ ...d, [day]: chip }))}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      (drafts[day] ?? "") === chip
                        ? "border-[#0071CE] bg-blue-50 text-[#0071CE]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[#0071CE] hover:text-[#0071CE]"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={drafts[day] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [day]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && requestRefine(day)}
                  placeholder="Or describe a change…"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0071CE] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => requestRefine(day)}
                  disabled={refine.isPending}
                  className="shrink-0 rounded-lg bg-[#0071CE] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#005ba6] disabled:opacity-60"
                >
                  Refine ✨
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SpendConfirmDialog
        open={pending !== null}
        cost={REFINE_COST}
        balance={balance}
        title={pending ? `Refine Day ${pending.day}?` : "Refine day?"}
        body={
          pending
            ? `AI will rework Day ${pending.day} (“${pending.instruction}”) and update your saved itinerary.`
            : undefined
        }
        onCancel={() => setPending(null)}
        onConfirm={confirmRefine}
        busy={refine.isPending}
      />
    </div>
  );
}
