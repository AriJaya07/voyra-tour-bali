"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/Dashboard/ThemeProvider";

// ─── Types ───────────────────────────────
interface Subscriber {
  id: string;
  email: string;
  status: "ACTIVE" | "UNSUBSCRIBED";
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ─── Theme helpers ────────────────────────
// Returns classes based on the current theme so the component
// looks correct in both dark and light dashboard modes.
function useThemeClasses(theme: "dark" | "light") {
  const isDark = theme === "dark";
  return {
    page:         isDark ? "bg-gray-950 text-white"                     : "bg-gray-50 text-gray-900",
    header:       isDark ? "bg-gray-900/80 border-gray-800"             : "bg-white/80 border-gray-200",
    subtext:      isDark ? "text-gray-400"                              : "text-gray-500",
    input:        isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-[#0071CE]"
                         : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#0071CE]",
    select:       isDark ? "bg-gray-800 border-gray-700 text-white"     : "bg-white border-gray-300 text-gray-900",
    card:         isDark ? "bg-gray-900 border-gray-800"                : "bg-white border-gray-200",
    tableHead:    isDark ? "border-gray-800 text-gray-400"              : "border-gray-200 text-gray-500",
    tableRow:     isDark ? "hover:bg-gray-800/40 divide-gray-800/60"    : "hover:bg-gray-50 divide-gray-100",
    cellText:     isDark ? "text-white"                                 : "text-gray-900",
    cellMuted:    isDark ? "text-gray-400"                              : "text-gray-500",
    badge:        isDark ? "bg-gray-800 border-gray-700"               : "bg-gray-100 border-gray-200",
    sourceBadge:  isDark ? "bg-gray-800 border-gray-700"               : "bg-gray-100 border-gray-200",
    pagination:   isDark ? "border-gray-800 text-gray-400"             : "border-gray-200 text-gray-500",
    pagBtn:       isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                         : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700",
    modalBg:      isDark ? "bg-gray-900 border-gray-700"               : "bg-white border-gray-200",
    modalCancel:  isDark ? "bg-gray-800 hover:bg-gray-700 text-white"  : "bg-gray-100 hover:bg-gray-200 text-gray-800",
    modalLabel:   isDark ? "text-gray-400"                             : "text-gray-500",
    searchIcon:   isDark ? "text-gray-500"                             : "text-gray-400",
    divider:      isDark ? "divide-gray-800/60"                        : "divide-gray-100",
  };
}

// ─── Component ───────────────────────────
export default function SubscribersAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const t = useThemeClasses(theme);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Auth Guard ──────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/sign-in");
    else if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/");
  }, [session, status, router]);

  // ── Fetch ───────────────────────────────
  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", search, status: filterStatus });
      const res = await fetch(`/api/admin/subscribers?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSubscribers(json.data);
      setMeta(json.meta);
    } catch {
      showToast("error", "Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") fetchSubscribers();
  }, [fetchSubscribers, session, status]);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  const handleStatusToggle = async (subscriber: Subscriber) => {
    const newStatus = subscriber.status === "ACTIVE" ? "UNSUBSCRIBED" : "ACTIVE";
    setSubscribers(prev => prev.map(s => s.id === subscriber.id ? { ...s, status: newStatus } : s));
    const res = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setSubscribers(prev => prev.map(s => s.id === subscriber.id ? { ...s, status: subscriber.status } : s));
      showToast("error", "Failed to update status.");
    } else {
      showToast("success", `Status updated to ${newStatus}.`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this subscriber?")) return;
    const res = await fetch(`/api/admin/subscribers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setMeta(prev => ({ ...prev, total: prev.total - 1 }));
      showToast("success", "Subscriber deleted.");
    } else {
      showToast("error", "Failed to delete subscriber.");
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    const res = await fetch("/api/admin/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) {
      setAddError(data.error || "Failed to add subscriber.");
    } else {
      setShowAdd(false);
      setNewEmail("");
      fetchSubscribers();
      showToast("success", `${newEmail} added successfully.`);
    }
  };

  if (status === "loading") {
    return (
      <div className={`min-h-screen flex items-center justify-center ${t.page}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className={`min-h-screen font-sans ${t.page}`}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg border transition-all ${
          toast.type === "success"
            ? "bg-green-900/90 border-green-700 text-green-300"
            : "bg-red-900/90 border-red-700 text-red-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Page Header */}
      <div className={`border-b backdrop-blur-sm sticky top-0 z-40 ${t.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight">✉️ Subscriber Management</h1>
            <p className={`text-xs mt-0.5 ${t.subtext}`}>
              {meta.total} total subscriber{meta.total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#0071CE] hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
          >
            + Add Subscriber
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.searchIcon}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`w-full border text-sm rounded-lg pl-9 pr-4 py-2.5 outline-none focus:ring-2 transition ${t.input}`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className={`border text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0071CE] cursor-pointer transition ${t.select}`}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
          </select>
        </div>

        {/* Table Card */}
        <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className={`text-center py-20 ${t.subtext}`}>
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold">No subscribers found.</p>
              {search && <p className="text-sm mt-1">Try a different search term.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left ${t.tableHead}`}>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Source</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider hidden md:table-cell">Subscribed</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className={`group transition-colors ${t.tableRow}`}>
                      <td className={`px-6 py-4 font-medium ${t.cellText}`}>{sub.email}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          sub.status === "ACTIVE"
                            ? "bg-green-500/10 text-green-500 border-green-500/30"
                            : `${t.badge} ${t.cellMuted}`
                        }`}>
                          {sub.status === "ACTIVE" ? "● Active" : "○ Unsubscribed"}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-xs hidden sm:table-cell ${t.cellMuted}`}>
                        <span className={`px-2 py-1 rounded-md border font-mono ${t.sourceBadge}`}>
                          {sub.source}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-xs hidden md:table-cell ${t.cellMuted}`}>
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatusToggle(sub)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                              sub.status === "ACTIVE"
                                ? "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                                : "border-green-500/40 text-green-500 hover:bg-green-500/10"
                            }`}
                          >
                            {sub.status === "ACTIVE" ? "Unsub" : "Reactivate"}
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && meta.totalPages > 1 && (
            <div className={`border-t px-6 py-4 flex items-center justify-between text-xs ${t.pagination}`}>
              <p>
                Showing {((page - 1) * meta.limit) + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1.5 rounded-lg border transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${t.pagBtn}`}
                >
                  ← Prev
                </button>
                <span className="font-bold">{page} / {meta.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className={`px-3 py-1.5 rounded-lg border transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${t.pagBtn}`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Subscriber Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`border rounded-2xl p-6 w-full max-w-md shadow-2xl ${t.modalBg}`}>
            <h2 className="text-lg font-black mb-4">Add Subscriber</h2>
            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${t.modalLabel}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className={`w-full border text-sm rounded-lg px-4 py-3 outline-none focus:ring-2 transition ${t.input}`}
                />
              </div>
              {addError && <p className="text-red-500 text-sm font-semibold">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError(""); setNewEmail(""); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${t.modalCancel}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-3 rounded-xl bg-[#0071CE] hover:bg-blue-600 text-white text-sm font-bold transition disabled:opacity-60"
                >
                  {addLoading ? "Adding..." : "Add Subscriber"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
