"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import BackLink from "@/components/common/BackLink";
import { useConfirm } from "@/components/common/ConfirmDialog";
import CreditMeter from "@/components/ai/CreditMeter";
import TopupCard from "@/components/ai/TopupCard";
import FamilySeatsPanel from "@/components/ai/FamilySeatsPanel";
import BucketBreakdown from "@/components/ai/BucketBreakdown";
import CreditTranslation from "@/components/ai/CreditTranslation";
import NextRenewalCountdown from "@/components/ai/NextRenewalCountdown";
import PriceLabel from "@/components/common/PriceLabel";
import { useMemo } from "react";
import {
  useAcceptFamilySeatMutation,
  useAiCatalog,
  useAiSubscription,
  useAiUsage,
  useAiWallet,
  useCancelSubscriptionMutation,
  useResumeSubscriptionMutation,
} from "@/utils/hooks/useAiWallet";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const ENDPOINT_LABEL: Record<string, string> = {
  chat: "Chat",
  plan: "Itinerary plan",
  plan_refine: "Plan refine",
  search: "Smart search",
  concierge: "Concierge",
  day_of_trip: "Day-of-trip",
  cultural: "Cultural co-pilot",
  voucher_read: "Voucher reader",
};

export default function AiWalletPage() {
  const { status } = useSession();
  const params = useSearchParams();
  const wallet = useAiWallet({ enabled: status === "authenticated" });
  const catalog = useAiCatalog();
  const usage = useAiUsage("7d", status === "authenticated");
  const subQ = useAiSubscription(status === "authenticated");
  const cancelMut = useCancelSubscriptionMutation();
  const resumeMut = useResumeSubscriptionMutation();
  const acceptSeatMut = useAcceptFamilySeatMutation();
  const confirm = useConfirm();

  const paidStatus = params.get("status");
  useEffect(() => {
    if (paidStatus === "success") toast.success("Payment received — credits land once Midtrans confirms.");
    if (paidStatus === "pending") toast.info("Payment pending — credits will be added once confirmed.");
    if (paidStatus === "error") toast.error("Payment failed. Try again or pick another method.");
  }, [paidStatus]);

  // Family seat invite token redemption: ?accept-seat=<token>
  const acceptSeatToken = params.get("accept-seat");
  useEffect(() => {
    if (!acceptSeatToken || status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        await acceptSeatMut.mutateAsync(acceptSeatToken);
        if (!cancelled) toast.success("Family seat accepted — premium AI features unlocked.");
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not accept seat");
      } finally {
        if (!cancelled) {
          // strip query so refresh doesn't retry
          const url = new URL(window.location.href);
          url.searchParams.delete("accept-seat");
          window.history.replaceState({}, "", url.toString());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptSeatToken, status]);

  const totals = useMemo(() => {
    const rows = usage.data?.usage ?? [];
    const map = new Map<string, { calls: number; creditsSpent: number }>();
    for (const row of rows) {
      if (row.status !== "OK") continue;
      const cur = map.get(row.endpoint) ?? { calls: 0, creditsSpent: 0 };
      cur.calls += 1;
      cur.creditsSpent += row.creditsCost;
      map.set(row.endpoint, cur);
    }
    return Array.from(map.entries()).map(([endpoint, v]) => ({ endpoint, ...v }));
  }, [usage.data?.usage]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    const WHAT_CREDITS_UNLOCK = [
      { icon: "✨", label: "Trip planner", cost: "8 credits" },
      { icon: "🔍", label: "Smart search", cost: "1 credit" },
      { icon: "🛕", label: "Cultural co-pilot", cost: "2 credits" },
      { icon: "🌧️", label: "Day-of-trip helper", cost: "Free for travelers" },
      { icon: "💬", label: "Ask about a tour", cost: "2 credits" },
      { icon: "📷", label: "Voucher reader", cost: "5 credits" },
    ];
    const BENEFITS = [
      { icon: "🎁", title: "Free monthly credits", body: "Every account gets a free grant each month — no card needed." },
      { icon: "⚡", title: "Top up anytime", body: "One-time packs when you need more. Credits never expire in their window." },
      { icon: "🔎", title: "Transparent pricing", body: "Every action shows its exact credit cost before you spend." },
      { icon: "👨‍👩‍👧", title: "Family seats", body: "Founder plan shares premium features with your travel party." },
    ];
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <BackLink href="/profile" />

        {/* Hero */}
        <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0071CE] to-[#005ba6] p-6 sm:p-8 text-white shadow-lg">
          <div className="relative z-10 max-w-lg">
            <span className="text-3xl" aria-hidden>💳</span>
            <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">Your AI wallet</h1>
            <p className="mt-2 text-sm text-blue-50 leading-relaxed">
              Credits power every Voyra AI tool — the trip planner, smart search, cultural co-pilot and more.
              Sign in to see your balance, top up, and track usage.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?callbackUrl=/ai/wallet"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition shadow-sm"
              >
                Sign in
              </Link>
              <Link
                href="/register?callbackUrl=/ai/wallet"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/15 border border-white/40 text-white font-bold rounded-full hover:bg-white/25 transition"
              >
                Create free account
              </Link>
            </div>
            <p className="mt-3 text-xs text-blue-100/90">Free monthly credits included.</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="shrink-0 text-2xl" aria-hidden>{b.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{b.title}</p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What credits unlock */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">What credits unlock</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {WHAT_CREDITS_UNLOCK.map((it) => (
              <div key={it.label} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <span className="text-lg" aria-hidden>{it.icon}</span>
                <span className="text-sm font-semibold text-slate-800">{it.label}</span>
                <span className="ml-auto text-[11px] font-bold text-[#0071CE]">{it.cost}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link
              href="/ai/pricing"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0071CE] hover:text-[#0071CE]"
            >
              View pricing plans
            </Link>
            <Link
              href="/ai/plan"
              className="inline-flex items-center justify-center rounded-full bg-[#0071CE] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#005ba6]"
            >
              ✨ Try the AI planner
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const w = wallet.data;
  const packs = catalog.data?.packs ?? [];
  const usageRows = usage.data?.usage ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <BackLink href="/profile" />
          <h1 className="text-2xl font-bold text-slate-900">AI Wallet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ai/tools"
            className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Open AI tools →
          </Link>
          <Link
            href="/ai/pricing"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            View subscription plans →
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Manage your AI credits, top up instantly, and review recent usage.
      </p>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <CreditMeter
          balance={w?.balance ?? 0}
          earned={w?.lifetimeEarned ?? 0}
          expiringIn7d={w?.expiringIn7d ?? 0}
          planLabel={w?.planLabel ?? "Free"}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            What you can do right now
          </div>
          <CreditTranslation amount={w?.balance ?? 0} variant="full" className="mt-3" />
          {w?.subscription && w.subscription.currentPeriodEnd ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {w.subscription.cancelAtPeriodEnd ? (
                <>
                  Subscription ends on{" "}
                  <span className="font-semibold text-slate-800">
                    {fmtDate(w.subscription.currentPeriodEnd)}
                  </span>{" "}
                  — credits keep their original expiry dates.
                </>
              ) : (
                <>
                  <NextRenewalCountdown at={w.subscription.currentPeriodEnd} />
                  {" · "}
                  <PriceLabel
                    amount={w.subscription.priceIdr}
                    sourceCurrency="IDR"
                    withSecondary
                    secondaryClassName="ml-1 text-xs text-slate-500 tabular-nums whitespace-nowrap"
                  />
                  {" · "}
                  {w.subscription.monthlyCredits} credits
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <BucketBreakdown buckets={w?.buckets ?? []} className="mt-4" />

      <FamilySeatsPanel />

      {subQ.data?.subscription ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {subQ.data.subscription.plan} subscription
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Status:{" "}
                <span className="font-semibold text-slate-700">
                  {subQ.data.subscription.status}
                </span>
                {subQ.data.subscription.cancelAtPeriodEnd ? (
                  <> · ends {fmtDate(subQ.data.subscription.currentPeriodEnd)}</>
                ) : (
                  <> · renews {fmtDate(subQ.data.subscription.currentPeriodEnd)}</>
                )}
                {subQ.data.subscription.pendingPlanKey ? (
                  <> · pending switch to {subQ.data.subscription.pendingPlanKey}</>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/ai/pricing"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Change plan
              </Link>
              {subQ.data.subscription.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await resumeMut.mutateAsync();
                      toast.success(res.message);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed to resume");
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Resume auto-renew
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Cancel auto-renew?",
                      description: "You keep credits until the current period ends.",
                      confirmLabel: "Cancel auto-renew",
                      cancelLabel: "Keep subscription",
                      destructive: true,
                    });
                    if (!ok) return;
                    try {
                      const res = await cancelMut.mutateAsync();
                      toast.success(res.message);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed to cancel");
                    }
                  }}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Cancel at period end
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Top up credits</h2>
        <p className="mt-1 text-sm text-slate-600">
          One-time packs. Credits never expire within their validity window.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((p) => (
            <TopupCard
              key={p.key}
              pack={p}
              highlight={p.key === "STANDARD"}
              onPaid={() => {
                toast.success("Payment received. Credits will appear shortly.");
                wallet.refetch();
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
        {totals.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {totals.map((t) => (
              <span
                key={t.endpoint}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {ENDPOINT_LABEL[t.endpoint] ?? t.endpoint}: {t.creditsSpent} credits ·{" "}
                {t.calls} calls
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Endpoint</th>
                <th className="px-4 py-2 text-right">Credits</th>
                <th className="px-4 py-2 text-right">Tokens out</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No usage yet. Try the AI chat or itinerary planner!
                  </td>
                </tr>
              ) : (
                usageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-slate-700">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {ENDPOINT_LABEL[row.endpoint] ?? row.endpoint}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-900">
                      {row.creditsCost}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-500">
                      {row.tokensOut ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          row.status === "OK"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.status === "DENIED_QUOTA"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  );
}
