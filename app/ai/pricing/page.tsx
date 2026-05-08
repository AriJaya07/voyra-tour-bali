"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { HiSparkles } from "react-icons/hi2";
import BackLink from "@/components/common/BackLink";
import PlanCard from "@/components/ai/PlanCard";
import TopupCard from "@/components/ai/TopupCard";
import UsageCalculator from "@/components/ai/UsageCalculator";
import PlansFAQ from "@/components/ai/PlansFAQ";
import CostComparisonTable from "@/components/ai/CostComparisonTable";
import CreditTranslation from "@/components/ai/CreditTranslation";
import { MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_URL } from "@/lib/config/midtrans";
import {
  useAiCatalog,
  useAiSubscription,
  useAiWallet,
  useChangeSubscriptionMutation,
  useStartSubscriptionMutation,
} from "@/utils/hooks/useAiWallet";
import type { AiPlan } from "@/utils/service/ai.service";

function ensureSnapScript() {
  if (typeof window === "undefined" || !MIDTRANS_SNAP_URL) return;
  if (document.querySelector(`script[src="${MIDTRANS_SNAP_URL}"]`)) return;
  const script = document.createElement("script");
  script.src = MIDTRANS_SNAP_URL;
  script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
  document.head.appendChild(script);
}

export default function PlansPage() {
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const catalog = useAiCatalog();
  const wallet = useAiWallet({ enabled: isAuthed });
  const subQ = useAiSubscription(isAuthed);
  const startMut = useStartSubscriptionMutation();
  const changeMut = useChangeSubscriptionMutation();
  const [tab, setTab] = useState<"plans" | "topups">("plans");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(ensureSnapScript, []);

  const plans = useMemo(() => catalog.data?.plans ?? [], [catalog.data]);
  const packs = useMemo(() => catalog.data?.packs ?? [], [catalog.data]);
  const currentPlan = wallet.data?.plan ?? "FREE";
  const subscription = subQ.data?.subscription ?? null;
  const hasActive = subscription && (subscription.status === "ACTIVE" || subscription.status === "GRACE");

  async function onSelectPlan(plan: AiPlan) {
    if (!isAuthed) {
      window.location.href = `/login?next=${encodeURIComponent("/ai/pricing")}`;
      return;
    }
    if (plan.priceIdr === 0) return;
    if (plan.key === currentPlan) return;

    setBusyPlan(plan.key);
    try {
      const res = hasActive
        ? await changeMut.mutateAsync(plan.key)
        : await startMut.mutateAsync(plan.key);

      const message = "message" in res ? (res as { message?: string }).message : undefined;
      if ("deferred" in res && res.deferred) {
        toast.success(message ?? "Downgrade scheduled for next renewal.");
        return;
      }
      if (!res.snapToken) {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        throw new Error("No payment token received");
      }
      const w = window;
      if (!w.snap) throw new Error("Payment SDK not loaded — please retry");

      w.snap.pay(res.snapToken, {
        onSuccess: () => {
          toast.success("Payment received — your plan is being activated.");
          window.location.href = "/ai/wallet?status=success";
        },
        onPending: () => {
          toast.info("Payment pending; we'll activate once Midtrans confirms.");
        },
        onError: () => {
          toast.error("Payment failed. Try again or pick another method.");
        },
        onClose: () => setBusyPlan(null),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Subscription failed");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackLink href="/" />

      <header className="mt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <HiSparkles className="h-3.5 w-3.5" /> Voyra AI Plans
        </span>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
          Plan smarter. Travel better.
        </h1>
        <p className="mt-2 max-w-2xl mx-auto text-sm text-slate-600 sm:text-base">
          Subscribe for monthly AI credits + premium features, or top up anytime.
          Credits are spent automatically as you chat, plan, and explore Bali.
        </p>
      </header>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("plans")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "plans"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setTab("topups")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "topups"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            One-time top-up
          </button>
        </div>
      </div>

      {tab === "plans" ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              current={p.key === currentPlan}
              busy={busyPlan === p.key}
              onSelect={onSelectPlan}
            />
          ))}
        </section>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {packs.map((p) => (
            <TopupCard key={p.key} pack={p} highlight={p.key === "STANDARD"} />
          ))}
        </section>
      )}

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <UsageCalculator />
        <CostComparisonTable />
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">How credits work</h2>
        <ul className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <li><span className="font-semibold">Chat:</span> 2 credits per turn</li>
          <li><span className="font-semibold">Itinerary plan:</span> 8 credits (≤7 days), 12 credits (8–14 days)</li>
          <li><span className="font-semibold">Plan refine:</span> 6 credits per day refined</li>
          <li><span className="font-semibold">Concierge:</span> 4 credits per turn</li>
          <li><span className="font-semibold">Cultural co-pilot:</span> 2 credits per turn</li>
          <li><span className="font-semibold">Day-of-trip:</span> 3 credits — free for confirmed travelers</li>
          <li><span className="font-semibold">Voucher reader (vision):</span> 5 credits per upload</li>
          <li><span className="font-semibold">Itinerary → bookings:</span> 0 credits — one-tap booking on Viator</li>
        </ul>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-3 text-xs">
            <div className="font-bold text-amber-800">Welcome bonus</div>
            <div className="mt-1 text-amber-900">50 credits, 7 days from signup.</div>
            <CreditTranslation amount={50} className="mt-1 !text-amber-700" />
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-xs">
            <div className="font-bold text-blue-800">Subscription credits</div>
            <div className="mt-1 text-blue-900">Valid 365 days from grant. Stack across renewals.</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-xs">
            <div className="font-bold text-emerald-800">Top-up packs</div>
            <div className="mt-1 text-emerald-900">Valid 365 days from purchase. No subscription required.</div>
          </div>
        </div>
      </section>

      <PlansFAQ className="mt-10" />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Ready to plan smarter?</h3>
          <p className="mt-1 text-xs text-slate-600">
            Cancel anytime · Credits keep their original expiry · 7-day refund window.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ai/wallet"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open my wallet
          </Link>
          <Link
            href="/ai/tools"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try AI tools →
          </Link>
        </div>
      </div>
    </main>
  );
}
