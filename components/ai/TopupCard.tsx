"use client";

import { useEffect, useState } from "react";
import { HiSparkles } from "react-icons/hi2";
import { MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_URL } from "@/lib/config/midtrans";
import { useAiTopupMutation } from "@/utils/hooks/useAiWallet";
import type { AiPack } from "@/utils/service/ai.service";

interface Props {
  pack: AiPack;
  highlight?: boolean;
  onPaid?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: Record<string, unknown>) => void;
    };
  }
}

function ensureSnapScript() {
  if (typeof window === "undefined" || !MIDTRANS_SNAP_URL) return;
  const existing = document.querySelector(`script[src="${MIDTRANS_SNAP_URL}"]`);
  if (existing) return;
  const script = document.createElement("script");
  script.src = MIDTRANS_SNAP_URL;
  script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
  document.head.appendChild(script);
}

export default function TopupCard({ pack, highlight = false, onPaid }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topup = useAiTopupMutation();

  useEffect(ensureSnapScript, []);

  const pricePerCredit = (pack.priceIdr / pack.credits).toFixed(2);

  async function handleBuy() {
    setError(null);
    setBusy(true);
    try {
      const res = await topup.mutateAsync(pack.key);
      if (!res.snapToken) {
        // Fallback: redirect URL
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        throw new Error("No payment token received");
      }
      const w = window;
      if (!w.snap) {
        throw new Error("Payment SDK not loaded — please retry");
      }
      w.snap.pay(res.snapToken, {
        onSuccess: () => {
          onPaid?.();
        },
        onPending: () => {
          onPaid?.();
        },
        onError: () => {
          setError("Payment failed. Please try again.");
        },
        onClose: () => {
          setBusy(false);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 shadow-sm transition
        ${highlight ? "border-blue-400 bg-blue-50/40 ring-1 ring-blue-200" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-2">
        <HiSparkles className="h-4 w-4 text-blue-500" />
        <h3 className="text-base font-semibold text-slate-900">{pack.label}</h3>
        {highlight ? (
          <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Best value
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          Rp {pack.priceIdr.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-600">
        {pack.credits.toLocaleString()} credits · Rp {pricePerCredit}/credit
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Valid {pack.expiryDays} days from purchase
      </div>

      <button
        onClick={handleBuy}
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy ? "Opening payment…" : "Buy now"}
      </button>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
