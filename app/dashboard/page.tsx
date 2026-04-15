"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { RefreshIcon } from "@/components/assets/Icon/shared";
import { Spinner, EmptyState } from "@/components/Dashboard/Overview";
import { formatPrice, CurrencyCode } from "@/utils/formatPrice";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    thisMonth: number;
  };
  revenue: { total: number; thisMonth: number };
  users: { total: number; thisMonth: number };
  recentBookings: {
    id: number;
    bookingRef: string;
    productTitle: string;
    productImage: string | null;
    totalPrice: number;
    currency: string;
    travelDate: string;
    status: string;
    createdAt: string;
    user: { name: string | null; email: string | null } | null;
  }[];
  topProducts: { productCode: string; productTitle: string; count: number }[];
  chart: { labels: string[]; bookings: number[]; revenue: number[] };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:   { label: "Pending",   color: "bg-amber-500/15 text-amber-400 border-amber-500/20",   dot: "bg-amber-400"  },
  PAYMENT:   { label: "Payment",   color: "bg-blue-500/15 text-blue-400 border-blue-500/20",       dot: "bg-blue-400"   },
  CONFIRMED: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  COMPLETED: { label: "Completed", color: "bg-teal-500/15 text-teal-400 border-teal-500/20",       dot: "bg-teal-400"   },
  CANCELLED: { label: "Cancelled", color: "bg-rose-500/15 text-rose-400 border-rose-500/20",       dot: "bg-rose-400"   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-700 text-slate-300 border-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Inline bar chart (bookings per month) ──────────────────────────────────────

function MonthlyChart({ labels, bookings, revenue }: { labels: string[]; bookings: number[]; revenue: number[] }) {
  const maxBookings = Math.max(...bookings, 1);
  const maxRevenue = Math.max(...revenue, 1);

  return (
    <div className="flex items-end gap-2 h-40">
      {labels.map((label, i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-0.5 h-32">
            <div
              className="flex-1 rounded-t-md bg-indigo-500/70 hover:bg-indigo-500 transition-all cursor-default"
              style={{ height: `${(bookings[i] / maxBookings) * 100}%`, minHeight: bookings[i] > 0 ? "4px" : "0" }}
              title={`Bookings: ${bookings[i]}`}
            />
            <div
              className="flex-1 rounded-t-md bg-emerald-500/70 hover:bg-emerald-500 transition-all cursor-default"
              style={{ height: `${(revenue[i] / maxRevenue) * 100}%`, minHeight: revenue[i] > 0 ? "4px" : "0" }}
              title={`Revenue: ${formatPrice(revenue[i], "IDR", "IDR")}`}
            />
          </div>
          <span className="text-slate-600 text-xs text-center leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, icon, color, isLoading, href,
}: {
  label: string; value: string | number; sub?: string; icon: string;
  color: string; isLoading: boolean; href?: string;
}) {
  const inner = (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 transition-all ${href ? "hover:border-slate-600 hover:scale-[1.02] cursor-pointer" : ""}`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
        <span className="text-lg">{icon}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-slate-800 rounded-lg animate-pulse mb-2" />
      ) : (
        <p className="text-2xl font-black text-white mb-0.5 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
          {value}
        </p>
      )}
      <p className="text-slate-400 text-sm font-semibold">{label}</p>
      {sub && <p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const conversionRate =
    data && data.bookings.total > 0
      ? Math.round(((data.bookings.confirmed + data.bookings.completed) / data.bookings.total) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Dashboard</p>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {isError && (
        <div className="bg-red-950/50 border border-red-800/50 text-red-400 rounded-2xl px-5 py-4 text-sm">
          Failed to load data. Please try refreshing.
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total Bookings"
          value={data?.bookings.total ?? 0}
          sub={`+${data?.bookings.thisMonth ?? 0} this month`}
          icon="🎫"
          color="from-indigo-600 to-violet-700"
          isLoading={isLoading}
          href="/dashboard/bookings"
        />
        <StatTile
          label="Revenue (Total)"
          value={isLoading ? "—" : formatPrice(data?.revenue.total ?? 0, "IDR" as CurrencyCode, "IDR" as CurrencyCode)}
          sub={`+${isLoading ? "…" : formatPrice(data?.revenue.thisMonth ?? 0, "IDR" as CurrencyCode, "IDR" as CurrencyCode)} this month`}
          icon="💰"
          color="from-emerald-600 to-teal-700"
          isLoading={isLoading}
        />
        <StatTile
          label="Confirmed"
          value={(data?.bookings.confirmed ?? 0) + (data?.bookings.completed ?? 0)}
          sub={`${conversionRate}% conversion rate`}
          icon="✅"
          color="from-teal-600 to-emerald-700"
          isLoading={isLoading}
          href="/dashboard/bookings"
        />
        <StatTile
          label="Total Users"
          value={data?.users.total ?? 0}
          sub={`+${data?.users.thisMonth ?? 0} this month`}
          icon="👤"
          color="from-sky-600 to-blue-700"
          isLoading={isLoading}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { key: "pending",   label: "Needs Action", value: data?.bookings.pending,   color: "border-amber-500/20 bg-amber-500/5",   text: "text-amber-300" },
          { key: "confirmed", label: "Confirmed",    value: data?.bookings.confirmed,  color: "border-emerald-500/20 bg-emerald-500/5", text: "text-emerald-300" },
          { key: "completed", label: "Completed",    value: data?.bookings.completed,  color: "border-teal-500/20 bg-teal-500/5",    text: "text-teal-300" },
          { key: "cancelled", label: "Cancelled",    value: data?.bookings.cancelled,  color: "border-rose-500/20 bg-rose-500/5",    text: "text-rose-300" },
          { key: "month",     label: "This Month",   value: data?.bookings.thisMonth,  color: "border-indigo-500/20 bg-indigo-500/5", text: "text-indigo-300" },
        ].map(({ key, label, value, color, text }) => (
          <div key={key} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            {isLoading ? (
              <div className="h-7 w-10 bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <p className={`text-3xl font-black ${text}`} style={{ fontFamily: "'Syne', sans-serif" }}>
                {value ?? 0}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Monthly chart */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-base">Monthly Activity</h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 6 months</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Bookings
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Revenue
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center"><Spinner color="violet" /></div>
          ) : (
            <MonthlyChart
              labels={data?.chart.labels ?? []}
              bookings={data?.chart.bookings ?? []}
              revenue={data?.chart.revenue ?? []}
            />
          )}
        </div>

        {/* Top products */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-base mb-1">Top Products</h2>
          <p className="text-slate-500 text-xs mb-5">Most booked tours</p>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center"><Spinner color="emerald" /></div>
          ) : !data?.topProducts.length ? (
            <EmptyState label="No bookings yet" />
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => {
                const maxCount = data.topProducts[0].count;
                const pct = Math.round((p.count / maxCount) * 100);
                const colors = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
                return (
                  <div key={p.productCode}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 text-xs font-semibold truncate max-w-[160px]">{p.productTitle}</span>
                      <span className="text-slate-500 text-xs flex-shrink-0 ml-2">{p.count} bookings</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-base">Recent Bookings</h2>
            <p className="text-slate-500 text-xs">Last 5 bookings across all users</p>
          </div>
          <Link href="/dashboard/bookings" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            View all →
          </Link>
        </div>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center"><Spinner color="violet" /></div>
        ) : !data?.recentBookings.length ? (
          <div className="px-6 py-8"><EmptyState label="No bookings yet" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Tour", "Customer", "Travel Date", "Price", "Status", "Booked"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 max-w-[200px]">
                      <p className="text-white text-sm font-medium truncate">{b.productTitle}</p>
                      <p className="text-slate-500 text-xs font-mono mt-0.5">{b.bookingRef}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-slate-300 text-sm">{b.user?.name ?? "—"}</p>
                      <p className="text-slate-600 text-xs truncate max-w-[140px]">{b.user?.email ?? ""}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-400 whitespace-nowrap">
                      {format(new Date(b.travelDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-bold text-white whitespace-nowrap">
                      {formatPrice(b.totalPrice, b.currency as CurrencyCode, "IDR" as CurrencyCode)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(b.createdAt), "dd MMM, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "All Bookings",    href: "/dashboard/bookings",    icon: "🎫" },
            { label: "Mock Links",      href: "/dashboard/viator-mock", icon: "🔗" },
            { label: "Manage Users",    href: "/dashboard/users",       icon: "👤" },
            { label: "Destinations",    href: "/dashboard/destinations", icon: "📍" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all group"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-slate-400 group-hover:text-white text-sm font-medium transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
