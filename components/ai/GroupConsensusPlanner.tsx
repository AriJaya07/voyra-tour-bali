"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";

interface MemberDraft {
  label: string;
  styleTags: string;
  budget: string;
  notes: string;
}

const COST = AI_ENDPOINT_COST.consensus; // 8
const BLANK: MemberDraft = { label: "", styleTags: "", budget: "flexible", notes: "" };

/**
 * Group Consensus Planner UI (Feature 7). Collect each traveller's preferences,
 * then let AI reconcile them into one balanced, saved itinerary.
 */
export default function GroupConsensusPlanner() {
  const router = useRouter();
  const [days, setDays] = useState(3);
  const [region, setRegion] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([
    { ...BLANK, label: "Traveller 1" },
    { ...BLANK, label: "Traveller 2" },
  ]);
  const [loading, setLoading] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);

  function updateMember(i: number, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function addMember() {
    if (members.length >= 6) return;
    setMembers((prev) => [...prev, { ...BLANK, label: `Traveller ${prev.length + 1}` }]);
  }
  function removeMember(i: number) {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generate() {
    const valid = members.filter((m) => m.label.trim());
    if (valid.length < 2) {
      toast.error("Add at least two travellers.");
      return;
    }
    setLoading(true);
    setRationale(null);
    try {
      const res = await fetch("/api/ai/plan-consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          region: region.trim() || undefined,
          members: valid.map((m) => ({
            label: m.label.trim(),
            styleTags: m.styleTags.split(",").map((s) => s.trim()).filter(Boolean),
            budget: m.budget,
            notes: m.notes.trim() || undefined,
          })),
        }),
      });
      if (res.status === 401) {
        toast.error("Please sign in to plan a group trip.");
        return;
      }
      if (res.status === 402) {
        toast.error("Out of AI credits — top up to plan a group trip.");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not build a plan.");
        return;
      }
      setRationale(data.rationale || "Your group plan is ready.");
      toast.success("Group plan created and saved to your trips.");
      setTimeout(() => router.push("/trips"), 1400);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-gray-700">Trip length</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-semibold text-gray-700">Base region (optional)</span>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Ubud, Canggu"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {members.map((m, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={m.label}
                  onChange={(e) => updateMember(i, { label: e.target.value })}
                  placeholder={`Traveller ${i + 1}`}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold focus:border-amber-400 focus:outline-none"
                />
                {members.length > 2 && (
                  <button
                    onClick={() => removeMember(i)}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                    aria-label="Remove traveller"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={m.styleTags}
                  onChange={(e) => updateMember(i, { styleTags: e.target.value })}
                  placeholder="Interests: adventure, food, culture"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                />
                <select
                  value={m.budget}
                  onChange={(e) => updateMember(i, { budget: e.target.value })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                >
                  <option value="budget">Budget</option>
                  <option value="flexible">Flexible</option>
                  <option value="moderate">Moderate</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
              <input
                value={m.notes}
                onChange={(e) => updateMember(i, { notes: e.target.value })}
                placeholder="Anything else? e.g. no early mornings, vegetarian"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={addMember}
            disabled={members.length >= 6}
            className="text-xs font-semibold text-amber-600 hover:underline disabled:opacity-40"
          >
            + Add traveller
          </button>
          <span className="text-[11px] font-semibold text-gray-400">{COST} credits</span>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Reconciling everyone's wishes…" : "Build our group plan"}
        </button>

        {rationale && (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-semibold">How we balanced it</p>
            <p className="mt-1 leading-relaxed">{rationale}</p>
            <p className="mt-2 text-xs text-green-600">Opening your trips…</p>
          </div>
        )}
      </div>
    </div>
  );
}
