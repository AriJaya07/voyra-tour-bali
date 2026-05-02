"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface UsageBy {
  endpoint: string;
  calls: number;
  creditsSpent: number;
  tokensIn: number;
  tokensOut: number;
  avgDurationMs: number;
}
interface StatusBy {
  status: string;
  count: number;
}
interface Spender {
  userId: number;
  email: string | null;
  name: string | null;
  creditsSpent: number;
}
interface MetricsResponse {
  range: string;
  since: string;
  usageByEndpoint: UsageBy[];
  usageByStatus: StatusBy[];
  topSpenders: Spender[];
  wallets: { totalUsers: number; balanceTotal: number; lifetimeEarned: number; lifetimeSpent: number };
  grantsInRange: { source: string; count: number; granted: number; stillRemaining: number }[];
  subscriptions: { plan: string; status: string; count: number }[];
  creditsSpentInRange: number;
  guestCalls: number;
}

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  subStatus: string | null;
  periodEnd: string | null;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  windowSpent: number;
  windowCalls: number;
}

interface AbuseResponse {
  range: string;
  totalDenials: number;
  guestIps: { ipHashPrefix: string | null; calls: number }[];
  userVelocity: { userId: number | null; email: string | null; name: string | null; creditsSpent: number; calls: number }[];
  deniedRepeats: { userId: number | null; email: string | null; denials: number }[];
}

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

export default function DashboardAiPage() {
  const [range, setRange] = useState<Range>("30d");
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"spend" | "balance" | "earned" | "calls">("spend");
  const [abuse, setAbuse] = useState<AbuseResponse | null>(null);

  // Grant form
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("100");
  const [grantReason, setGrantReason] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);

  // Refund form
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  useEffect(() => {
    void fetchAll(range, sort, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, sort]);

  async function fetchAll(r: Range, s: typeof sort, q: string) {
    const [m, u, ab] = await Promise.allSettled([
      fetch(`/api/admin/ai/metrics?range=${r}`, { cache: "no-store" }).then((res) => res.json()),
      fetch(`/api/admin/ai/users?range=${r}&sort=${s}&search=${encodeURIComponent(q)}`, { cache: "no-store" }).then((res) => res.json()),
      fetch(`/api/admin/ai/abuse?range=${r === "90d" ? "30d" : r === "30d" ? "7d" : "24h"}`, { cache: "no-store" }).then((res) => res.json()),
    ]);
    if (m.status === "fulfilled" && !m.value.error) setMetrics(m.value);
    if (u.status === "fulfilled" && !u.value.error) setUsers(u.value.rows ?? []);
    if (ab.status === "fulfilled" && !ab.value.error) setAbuse(ab.value);
  }

  async function onGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantBusy(true);
    try {
      const res = await fetch("/api/admin/ai/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(grantUserId),
          amount: Number(grantAmount),
          reason: grantReason || "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Grant failed");
      toast.success(`Granted ${data.amount} credits to user ${data.userId}`);
      setGrantUserId("");
      setGrantReason("");
      void fetchAll(range, sort, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setGrantBusy(false);
    }
  }

  async function onRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Refund ${refundPaymentId}? This reclaims unspent credits.`)) return;
    setRefundBusy(true);
    try {
      const res = await fetch("/api/admin/ai/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: refundPaymentId, reason: refundReason || "admin refund" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Refund failed");
      toast.success(
        `Refund OK — reclaimed ${data.reclaimed}/${data.totalGranted} credits${data.note ? ` · ${data.note}` : ""}`
      );
      setRefundPaymentId("");
      setRefundReason("");
      void fetchAll(range, sort, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setRefundBusy(false);
    }
  }

  const idr = useMemo(() => new Intl.NumberFormat("en-US"), []);

  return (
    <main className="px-6 py-6 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Subsystem</h1>
          <p className="text-sm text-slate-400">
            Metrics, abuse, grants, refunds — operational view
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                range === r
                  ? "border-violet-400 bg-violet-500/20 text-violet-100"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* KPI cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Wallets" value={metrics?.wallets.totalUsers ?? 0} sub="users with AI activity" />
        <Stat title="Credits in circulation" value={idr.format(metrics?.wallets.balanceTotal ?? 0)} />
        <Stat title="Spent in range" value={idr.format(metrics?.creditsSpentInRange ?? 0)} sub={range} />
        <Stat title="Guest calls" value={idr.format(metrics?.guestCalls ?? 0)} sub={range} />
      </section>

      {/* Usage by endpoint */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Usage by endpoint</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Endpoint</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Credits</th>
                <th className="px-3 py-2 text-right">Tokens in / out</th>
                <th className="px-3 py-2 text-right">Avg ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(metrics?.usageByEndpoint ?? []).map((u) => (
                <tr key={u.endpoint}>
                  <td className="px-3 py-2 font-mono">{u.endpoint}</td>
                  <td className="px-3 py-2 text-right">{idr.format(u.calls)}</td>
                  <td className="px-3 py-2 text-right">{idr.format(u.creditsSpent)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">
                    {idr.format(u.tokensIn)} / {idr.format(u.tokensOut)}
                  </td>
                  <td className="px-3 py-2 text-right">{u.avgDurationMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Subscriptions */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Subscriptions</h2>
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
            {(metrics?.subscriptions ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No subscriptions yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(metrics?.subscriptions ?? []).map((s) => (
                  <li key={`${s.plan}-${s.status}`} className="flex justify-between">
                    <span className="font-mono">
                      {s.plan} <span className="text-slate-500">{s.status}</span>
                    </span>
                    <span className="font-bold">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Top spenders */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Top spenders ({range})</h2>
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <ul className="space-y-1 text-sm">
              {(metrics?.topSpenders ?? []).slice(0, 10).map((s) => (
                <li key={s.userId} className="flex justify-between gap-2">
                  <span className="truncate">
                    #{s.userId} {s.email ?? "—"}
                  </span>
                  <span className="font-bold tabular-nums">{idr.format(s.creditsSpent)}</span>
                </li>
              ))}
              {(metrics?.topSpenders ?? []).length === 0 ? (
                <li className="text-slate-500">No spend in range.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>

      {/* Users table */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Users</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAll(range, sort, search)}
              placeholder="email or name"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm placeholder-slate-500"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
            >
              <option value="spend">spend</option>
              <option value="calls">calls</option>
              <option value="balance">balance</option>
              <option value="earned">earned</option>
            </select>
            <button
              type="button"
              onClick={() => fetchAll(range, sort, search)}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-700"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Earned</th>
                <th className="px-3 py-2 text-right">Spent ({range})</th>
                <th className="px-3 py-2 text-right">Calls ({range})</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.name ?? "—"}</div>
                    <div className="text-xs text-slate-400">
                      #{u.id} · {u.email}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {u.plan}
                    {u.subStatus ? <div className="text-xs text-slate-400">{u.subStatus}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{idr.format(u.balance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{idr.format(u.lifetimeEarned)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{idr.format(u.windowSpent)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{idr.format(u.windowCalls)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setGrantUserId(String(u.id))}
                      className="rounded bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30"
                    >
                      Grant
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    No matches.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grant + Refund forms */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <form onSubmit={onGrant} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Manual grant</h3>
          <div className="mt-3 grid gap-2">
            <input
              required
              type="number"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="userId"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="credits"
              min={1}
              max={100000}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="reason (logged in audit)"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={grantBusy}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {grantBusy ? "Granting…" : "Grant credits"}
            </button>
          </div>
        </form>

        <form onSubmit={onRefund} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Refund payment</h3>
          <div className="mt-3 grid gap-2">
            <input
              required
              type="text"
              value={refundPaymentId}
              onChange={(e) => setRefundPaymentId(e.target.value)}
              placeholder="paymentId (e.g. AITOP-12-...)"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono"
            />
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="reason"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">
              Reclaims unspent credits + flips status to REFUNDED. Process the
              actual money refund in Midtrans dashboard separately.
            </p>
            <button
              type="submit"
              disabled={refundBusy}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
            >
              {refundBusy ? "Refunding…" : "Refund"}
            </button>
          </div>
        </form>
      </section>

      {/* Abuse panel */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Abuse signals · {abuse?.range ?? "—"} · {abuse?.totalDenials ?? 0} total denials
        </h2>
        <div className="mt-2 grid gap-3 lg:grid-cols-3">
          <Panel title="Guest IPs">
            <ul className="space-y-1 text-xs font-mono">
              {(abuse?.guestIps ?? []).map((g) => (
                <li key={g.ipHashPrefix ?? "_"} className="flex justify-between">
                  <span>{g.ipHashPrefix ?? "—"}…</span>
                  <span className="font-bold">{g.calls}</span>
                </li>
              ))}
              {(abuse?.guestIps ?? []).length === 0 ? <li className="text-slate-500">none</li> : null}
            </ul>
          </Panel>
          <Panel title="User velocity">
            <ul className="space-y-1 text-xs">
              {(abuse?.userVelocity ?? []).map((u) => (
                <li key={u.userId} className="flex justify-between gap-2">
                  <span className="truncate">{u.email ?? `#${u.userId}`}</span>
                  <span className="font-bold tabular-nums">
                    {u.creditsSpent}/{u.calls}
                  </span>
                </li>
              ))}
              {(abuse?.userVelocity ?? []).length === 0 ? <li className="text-slate-500">none</li> : null}
            </ul>
          </Panel>
          <Panel title="Denied repeats">
            <ul className="space-y-1 text-xs">
              {(abuse?.deniedRepeats ?? []).map((d) => (
                <li key={d.userId} className="flex justify-between gap-2">
                  <span className="truncate">{d.email ?? `#${d.userId}`}</span>
                  <span className="font-bold">{d.denials}</span>
                </li>
              ))}
              {(abuse?.deniedRepeats ?? []).length === 0 ? <li className="text-slate-500">none</li> : null}
            </ul>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
