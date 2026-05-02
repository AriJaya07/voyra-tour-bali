"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HiSparkles } from "react-icons/hi2";
import { useAiWallet, useLoyaltyRedeemMutation } from "@/utils/hooks/useAiWallet";

interface Props {
  pointsBalance: number;
  /** Called after successful redemption so parent can refetch loyalty. */
  onRedeemed?: (response: { pointsRedeemed: number; creditsGranted: number }) => void;
}

const STEP = 1_000;
const CREDITS_PER_STEP = 50;

export default function LoyaltyRedeemCard({ pointsBalance, onRedeemed }: Props) {
  const wallet = useAiWallet({ enabled: true });
  const redeem = useLoyaltyRedeemMutation();
  const planFeatures = wallet.data?.planFeatures;
  const concierge = !!planFeatures?.concierge;
  const [points, setPoints] = useState(STEP);

  const maxSteps = Math.floor(pointsBalance / STEP);
  const credits = Math.floor(points / STEP) * CREDITS_PER_STEP;

  async function onSubmit() {
    if (points < STEP || points % STEP !== 0) {
      toast.error(`Pick a multiple of ${STEP} points`);
      return;
    }
    try {
      const res = await redeem.mutateAsync(points);
      toast.success(`+${res.creditsGranted} AI credits — expires in ${res.expiresInDays} days`);
      onRedeemed?.(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Redemption failed");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <HiSparkles className="h-4 w-4 text-blue-500" />
        <h3 className="text-base font-semibold text-slate-900">Redeem points for AI credits</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {STEP.toLocaleString()} points → {CREDITS_PER_STEP} AI credits. Credits valid 90 days.
      </p>

      {!concierge ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Loyalty redemption is for Voyager / Founder subscribers.{" "}
          <Link href="/plans" className="font-semibold underline">
            See plans →
          </Link>
        </div>
      ) : maxSteps === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          You need at least {STEP.toLocaleString()} points to redeem. Earn more by booking tours.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            type="range"
            min={STEP}
            max={maxSteps * STEP}
            step={STEP}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-bold text-slate-900">{points.toLocaleString()}</span>{" "}
              <span className="text-slate-500">points</span>
            </div>
            <div className="text-blue-600 font-bold">+{credits.toLocaleString()} credits</div>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={redeem.isPending || maxSteps === 0}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {redeem.isPending ? "Redeeming…" : `Redeem ${points.toLocaleString()} points`}
          </button>
        </div>
      )}
    </div>
  );
}
