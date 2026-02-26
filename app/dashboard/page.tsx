"use client";

import Sidebar from "@/components/Dashboard/Sidebar";
import { useDashboardStats } from "@/utils/hooks/useDashboardStats";
import Link from "next/link";
import { useEffect, useRef } from "react";

// ── Formatter helpers ─────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 0 });
const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function DashboardOverviewPage() {
  const { data, isLoading, isError, refetch } = useDashboardStats();

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── Page Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Dashboard</p>
              <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                Overview
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {isError && (
            <div className="bg-red-950/50 border border-red-800/50 text-red-400 rounded-2xl px-5 py-4 text-sm">
              ⚠️ Gagal memuat data. Coba refresh halaman.
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Kategori"
              value={data?.counts.categories}
              isLoading={isLoading}
              icon="🏷️"
              color="from-emerald-600 to-teal-700"
              href="/dashboard/categories"
              sub="Kelola kategori"
            />
            <KpiCard
              label="Total Destinasi"
              value={data?.counts.destinations}
              isLoading={isLoading}
              icon="📍"
              color="from-blue-600 to-sky-700"
              href="/dashboard/destinations"
              sub="Kelola destinasi"
            />
            <KpiCard
              label="Total Packages"
              value={data?.counts.packages}
              isLoading={isLoading}
              icon="📦"
              color="from-violet-600 to-indigo-700"
              href="/dashboard/packages"
              sub="Kelola packages"
            />
            <KpiCard
              label="Total Gambar"
              value={data?.counts.images}
              isLoading={isLoading}
              icon="🖼️"
              color="from-rose-600 to-pink-700"
              href="/dashboard/images"
              sub="Kelola gambar"
            />
          </div>

          {/* ── Value Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ValueCard
              label="Total Nilai Packages"
              value={isLoading ? null : fmtUSD(data?.values.totalPackageValue ?? 0)}
              sub={isLoading ? "..." : `Rata-rata: ${fmtUSD(data?.values.avgPackagePrice ?? 0)}`}
              isLoading={isLoading}
              accent="violet"
            />
            <ValueCard
              label="Package Termahal"
              value={isLoading ? null : fmtUSD(data?.values.maxPackagePrice ?? 0)}
              sub={isLoading ? "..." : `Termurah: ${fmtUSD(data?.values.minPackagePrice ?? 0)}`}
              isLoading={isLoading}
              accent="amber"
            />
            <ValueCard
              label="Total Nilai Destinasi"
              value={isLoading ? null : fmtUSD(data?.values.totalDestinationValue ?? 0)}
              sub={isLoading ? "..." : `Rata-rata: ${fmtUSD(data?.values.avgDestinationPrice ?? 0)}`}
              isLoading={isLoading}
              accent="blue"
            />
          </div>

          {/* ── Chart + Category Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Monthly chart */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-base">Pertumbuhan Bulanan</h2>
                  <p className="text-slate-500 text-xs mt-0.5">6 bulan terakhir</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Packages
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Destinasi
                  </div>
                </div>
              </div>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Spinner color="violet" />
                </div>
              ) : (
                <BarChart
                  labels={data?.monthlyData.labels ?? []}
                  packages={data?.monthlyData.packages ?? []}
                  destinations={data?.monthlyData.destinations ?? []}
                />
              )}
            </div>

            {/* Category breakdown */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-1">Per Kategori</h2>
              <p className="text-slate-500 text-xs mb-5">Packages & destinasi</p>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Spinner color="emerald" />
                </div>
              ) : data?.categoryBreakdown.length === 0 ? (
                <EmptyState label="Belum ada kategori" />
              ) : (
                <div className="space-y-3">
                  {(data?.categoryBreakdown ?? []).map((cat, i) => (
                    <CategoryBar key={cat.slug} cat={cat} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Data ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Destinations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div>
                  <h2 className="text-white font-bold text-base">Destinasi Terbaru</h2>
                  <p className="text-slate-500 text-xs">5 destinasi terakhir ditambah</p>
                </div>
                <Link href="/dashboard/destinations" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Lihat semua →
                </Link>
              </div>
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <Spinner color="blue" />
                </div>
              ) : data?.recentDestinations.length === 0 ? (
                <div className="px-6 py-8"><EmptyState label="Belum ada destinasi" /></div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {data?.recentDestinations.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-800/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{d.title.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{d.title}</p>
                        <p className="text-slate-500 text-xs">
                          {d.category?.name ?? "No category"} · {d._count.images} gambar
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm font-bold">{d.price ? fmtUSD(d.price) : "—"}</p>
                        <p className="text-slate-600 text-xs">{fmtDate(d.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Packages */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div>
                  <h2 className="text-white font-bold text-base">Packages Terbaru</h2>
                  <p className="text-slate-500 text-xs">5 packages terakhir ditambah</p>
                </div>
                <Link href="/dashboard/packages" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Lihat semua →
                </Link>
              </div>
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <Spinner color="violet" />
                </div>
              ) : data?.recentPackages.length === 0 ? (
                <div className="px-6 py-8"><EmptyState label="Belum ada package" /></div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {data?.recentPackages.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-800/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{p.title.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                        <p className="text-slate-500 text-xs truncate">
                          {p.destination?.title ?? "No destination"} · {p.category?.name ?? "No category"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm font-bold">{fmtUSD(p.price)}</p>
                        <p className="text-slate-600 text-xs">{fmtDate(p.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Top Packages by Price ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-white font-bold text-base">Top Packages by Price</h2>
                <p className="text-slate-500 text-xs">5 package dengan harga tertinggi</p>
              </div>
              <Link href="/dashboard/packages" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Lihat semua →
              </Link>
            </div>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center"><Spinner color="amber" /></div>
            ) : data?.topPackages.length === 0 ? (
              <div className="px-6 py-8"><EmptyState label="Belum ada package" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["Rank", "Package", "Kategori", "Destinasi", "Harga"].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data?.topPackages.map((pkg, i) => (
                      <tr key={pkg.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            i === 0 ? "bg-amber-500/20 text-amber-400"
                            : i === 1 ? "bg-slate-600/40 text-slate-300"
                            : i === 2 ? "bg-orange-700/20 text-orange-400"
                            : "bg-slate-800 text-slate-500"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="text-white text-sm font-semibold">{pkg.title}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          {pkg.category ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                              {pkg.category.name}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          {pkg.destination ? (
                            <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 text-xs font-medium border border-sky-500/20">
                              {pkg.destination.title}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-white font-bold text-sm">{fmtUSD(pkg.price)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Quick Links ── */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Tambah Kategori", href: "/dashboard/categories", icon: "🏷️", color: "emerald" },
                { label: "Tambah Destinasi", href: "/dashboard/destinations", icon: "📍", color: "blue" },
                { label: "Tambah Package", href: "/dashboard/packages", icon: "📦", color: "violet" },
                { label: "Upload Gambar", href: "/dashboard/images", icon: "🖼️", color: "rose" },
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
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════

function KpiCard({
  label, value, isLoading, icon, color, href, sub,
}: {
  label: string;
  value?: number;
  isLoading: boolean;
  icon: string;
  color: string;
  href: string;
  sub: string;
}) {
  return (
    <Link href={href} className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all hover:scale-[1.02] block">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
        <span className="text-lg">{icon}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-16 bg-slate-800 rounded-lg animate-pulse mb-2" />
      ) : (
        <p className="text-3xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
          {value ?? 0}
        </p>
      )}
      <p className="text-slate-400 text-sm font-semibold">{label}</p>
      <p className="text-slate-600 text-xs mt-0.5 group-hover:text-slate-400 transition-colors">{sub} →</p>
    </Link>
  );
}

function ValueCard({
  label, value, sub, isLoading, accent,
}: {
  label: string;
  value: string | null;
  sub: string;
  isLoading: boolean;
  accent: "violet" | "amber" | "blue";
}) {
  const colors = {
    violet: "border-violet-500/20 bg-violet-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
  };
  const textColors = {
    violet: "text-violet-300",
    amber: "text-amber-300",
    blue: "text-blue-300",
  };

  return (
    <div className={`rounded-2xl border p-5 ${colors[accent]}`}>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      {isLoading ? (
        <div className="h-7 w-28 bg-slate-800 rounded-lg animate-pulse mb-2" />
      ) : (
        <p className={`text-2xl font-black ${textColors[accent]}`} style={{ fontFamily: "'Syne', sans-serif" }}>
          {value}
        </p>
      )}
      <p className="text-slate-600 text-xs mt-1">{sub}</p>
    </div>
  );
}

const COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#06b6d4"];

function CategoryBar({
  cat,
  index,
}: {
  cat: { name: string; packages: number; destinations: number };
  index: number;
}) {
  const total = cat.packages + cat.destinations;
  const maxPossible = 20; // relative bar width
  const pct = Math.min((total / maxPossible) * 100, 100);
  const color = COLORS[index % COLORS.length];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-300 text-xs font-semibold truncate max-w-[120px]">{cat.name}</span>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
          <span>{cat.packages} pkg</span>
          <span>{cat.destinations} dest</span>
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function BarChart({
  labels,
  packages,
  destinations,
}: {
  labels: string[];
  packages: number[];
  destinations: number[];
}) {
  const max = Math.max(...packages, ...destinations, 1);

  return (
    <div className="flex items-end gap-2 h-48">
      {labels.map((label, i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-0.5 h-36">
            {/* Packages bar */}
            <div
              className="flex-1 rounded-t-md bg-violet-500/70 hover:bg-violet-500 transition-all"
              style={{ height: `${(packages[i] / max) * 100}%`, minHeight: packages[i] > 0 ? "4px" : "0" }}
              title={`Packages: ${packages[i]}`}
            />
            {/* Destinations bar */}
            <div
              className="flex-1 rounded-t-md bg-sky-500/70 hover:bg-sky-500 transition-all"
              style={{ height: `${(destinations[i] / max) * 100}%`, minHeight: destinations[i] > 0 ? "4px" : "0" }}
              title={`Destinations: ${destinations[i]}`}
            />
          </div>
          <span className="text-slate-600 text-xs text-center leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  const colors: Record<string, string> = {
    violet: "border-violet-500",
    blue: "border-blue-500",
    emerald: "border-emerald-500",
    amber: "border-amber-500",
  };
  return (
    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${colors[color] ?? "border-slate-500"}`} />
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <p className="text-slate-600 text-sm">{label}</p>
    </div>
  );
}