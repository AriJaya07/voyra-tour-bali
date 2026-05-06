"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/common/ConfirmDialog";

type TableStat = {
  key: string;
  label: string;
  count: number;
  oldest: string | null;
  retention: string;
};

type StatsResponse = {
  tables: TableStat[];
  fetchedAt: string;
};

const ACCENT: Record<string, { bg: string; ring: string; text: string; bar: string }> = {
  aiUsage:         { bg: "bg-violet-500/10",  ring: "border-violet-500/30",  text: "text-violet-300",  bar: "bg-violet-500" },
  aiCreditLedger:  { bg: "bg-blue-500/10",    ring: "border-blue-500/30",    text: "text-blue-300",    bar: "bg-blue-500" },
  appNotification: { bg: "bg-amber-500/10",   ring: "border-amber-500/30",   text: "text-amber-300",   bar: "bg-amber-500" },
  emailDelivery:   { bg: "bg-rose-500/10",    ring: "border-rose-500/30",    text: "text-rose-300",    bar: "bg-rose-500" },
  recentlyViewed:  { bg: "bg-sky-500/10",     ring: "border-sky-500/30",     text: "text-sky-300",     bar: "bg-sky-500" },
  aiChatMemory:    { bg: "bg-emerald-500/10", ring: "border-emerald-500/30", text: "text-emerald-300", bar: "bg-emerald-500" },
  booking:         { bg: "bg-slate-500/10",   ring: "border-slate-500/30",   text: "text-slate-300",   bar: "bg-slate-500" },
};

const CLEANABLE: Record<string, { target: string; label: string }> = {
  aiCreditLedger:  { target: "ledger",            label: "AI Credit Ledger" },
  appNotification: { target: "appNotifications",  label: "App Notifications" },
  emailDelivery:   { target: "emailDelivery",     label: "Email Delivery" },
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return `${d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · ${days}d ago`;
};

const fmtCount = (n: number) => n.toLocaleString("en-US");

export default function DbHealthPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/db-stats", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load DB stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runCleanup = async (key: string, dryRun: boolean) => {
    const meta = CLEANABLE[key];
    if (!meta) return;

    if (!dryRun) {
      const ok = await confirm({
        title: `Run cleanup for ${meta.label}?`,
        description: "Rows past their retention window will be permanently deleted. This cannot be undone.",
        confirmLabel: "Delete now",
        destructive: true,
      });
      if (!ok) return;
    }

    setBusy(key);
    try {
      const res = await fetch("/api/admin/db-stats/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: meta.target, dryRun }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Cleanup failed");
      setResults((p) => ({ ...p, [key]: dryRun ? formatDry(body) : formatRun(body) }));
      if (!dryRun) await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "unknown";
      setResults((p) => ({ ...p, [key]: `Error: ${m}` }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-10 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Maintenance
            </p>
            <h1
              className="text-3xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              DB Health
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Row counts and retention for heavy tables. Run sweeps on demand.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.tables.map((t) => {
              const a = ACCENT[t.key] ?? ACCENT.booking;
              const cleanable = CLEANABLE[t.key];
              const result = results[t.key];
              const isBusy = busy === t.key;
              return (
                <div
                  key={t.key}
                  className={`rounded-2xl border ${a.ring} ${a.bg} p-5`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        {t.label}
                      </p>
                      <p
                        className={`text-3xl font-black ${a.text}`}
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        {fmtCount(t.count)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">rows</p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${a.bar} mt-2`} />
                  </div>

                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Oldest row</dt>
                      <dd className="text-slate-300">{fmtDate(t.oldest)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 flex-shrink-0">Retention</dt>
                      <dd className="text-slate-400 text-right">{t.retention}</dd>
                    </div>
                  </dl>

                  {cleanable && (
                    <div className="mt-4 pt-4 border-t border-slate-700/40">
                      <div className="flex gap-2">
                        <button
                          onClick={() => runCleanup(t.key, true)}
                          disabled={isBusy}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isBusy ? "Working…" : "Dry run"}
                        </button>
                        <button
                          onClick={() => runCleanup(t.key, false)}
                          disabled={isBusy}
                          className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isBusy ? "Working…" : "Run cleanup"}
                        </button>
                      </div>
                      {result && (
                        <p className="mt-2 text-xs text-slate-400 font-mono break-words">
                          {result}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && (
          <p className="mt-6 text-xs text-slate-600">
            Last fetched {new Date(data.fetchedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

type CleanupResponse = {
  wouldDelete?: number;
  wouldDeleteSettled?: number;
  wouldDeletePlain?: number;
  wouldDeleteDismissed?: number;
  wouldDeleteRead?: number;
  wouldDeleteUnread?: number;
  deleted?: number;
  deletedSettled?: number;
  deletedPlain?: number;
  deletedDismissed?: number;
  deletedRead?: number;
  deletedUnread?: number;
};

function formatDry(body: CleanupResponse): string {
  if (typeof body.wouldDelete === "number") return `Dry run: would delete ${body.wouldDelete}`;
  const parts: string[] = [];
  if (typeof body.wouldDeleteSettled === "number") parts.push(`settled=${body.wouldDeleteSettled}`);
  if (typeof body.wouldDeletePlain === "number") parts.push(`plain=${body.wouldDeletePlain}`);
  if (typeof body.wouldDeleteDismissed === "number") parts.push(`dismissed=${body.wouldDeleteDismissed}`);
  if (typeof body.wouldDeleteRead === "number") parts.push(`read=${body.wouldDeleteRead}`);
  if (typeof body.wouldDeleteUnread === "number") parts.push(`unread=${body.wouldDeleteUnread}`);
  return `Dry run: ${parts.join(" · ") || JSON.stringify(body)}`;
}

function formatRun(body: CleanupResponse): string {
  if (typeof body.deleted === "number") return `Deleted ${body.deleted} rows`;
  const parts: string[] = [];
  if (typeof body.deletedSettled === "number") parts.push(`settled=${body.deletedSettled}`);
  if (typeof body.deletedPlain === "number") parts.push(`plain=${body.deletedPlain}`);
  if (typeof body.deletedDismissed === "number") parts.push(`dismissed=${body.deletedDismissed}`);
  if (typeof body.deletedRead === "number") parts.push(`read=${body.deletedRead}`);
  if (typeof body.deletedUnread === "number") parts.push(`unread=${body.deletedUnread}`);
  return `Deleted: ${parts.join(" · ") || JSON.stringify(body)}`;
}
