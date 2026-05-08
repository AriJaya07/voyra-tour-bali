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
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-center">
        <BackLink href="/profile" />
        <h1 className="mt-6 text-xl font-bold text-slate-900">Sign in to view your AI wallet</h1>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
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
