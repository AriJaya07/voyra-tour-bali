"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/Dashboard/ThemeProvider";
import { SearchIcon } from "@/components/assets/Icon/shared";

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  provider: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  loginLockedUntil: string | null;
  createdAt: string;
}

interface Page {
  users: UserRow[];
  page: number;
  totalPages: number;
  total: number;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

function useT(theme: "dark" | "light") {
  const dark = theme === "dark";
  return {
    page: dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900",
    card: dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
    input: dark
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
    select: dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900",
    head: dark ? "text-gray-400 border-gray-800" : "text-gray-500 border-gray-200",
    row: dark ? "hover:bg-gray-800/40 border-gray-800/60" : "hover:bg-gray-50 border-gray-100",
    muted: dark ? "text-gray-400" : "text-gray-500",
    btn: dark ? "bg-gray-800 hover:bg-gray-700 border-gray-700" : "bg-white hover:bg-gray-50 border-gray-300",
  };
}

export default function AdminUsersPage() {
  const { theme } = useTheme();
  const t = useT(theme);

  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [q, filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={`min-h-screen pt-6 pb-16 px-4 sm:px-8 ${t.page}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className={`text-sm ${t.muted}`}>
              Manage accounts, 2FA, lockouts. {data?.total ?? 0} total.
            </p>
          </div>
        </div>

        <div className={`flex flex-col sm:flex-row gap-2 mb-4 ${t.card} border rounded-xl p-3`}>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search email or name…"
              className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none ${t.input}`}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm border rounded-lg ${t.select}`}
          >
            <option value="all">All users</option>
            <option value="2fa_on">2FA enabled</option>
            <option value="2fa_off">2FA disabled</option>
            <option value="locked">Locked out</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className={`${t.card} border rounded-xl overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-xs font-bold uppercase tracking-wide border-b ${t.head}`}>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">2FA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${t.muted}`}>Loading…</td>
                </tr>
              ) : !data?.users.length ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${t.muted}`}>No users found</td>
                </tr>
              ) : (
                data.users.map((u) => {
                  const locked = u.loginLockedUntil && new Date(u.loginLockedUntil) > new Date();
                  return (
                    <tr key={u.id} className={`border-b ${t.row} transition`}>
                      <td className="px-4 py-3">
                        <p className="font-bold">{u.name || "—"}</p>
                        <p className={`text-xs ${t.muted}`}>{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">{u.twoFactorEnabled ? "🔒 ON" : "—"}</td>
                      <td className="px-4 py-3">
                        {locked ? <span className="text-amber-500">Locked</span> :
                         !u.emailVerified ? <span className={t.muted}>Unverified</span> :
                         <span className="text-emerald-500">Active</span>}
                      </td>
                      <td className={`px-4 py-3 ${t.muted}`}>{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/users/${u.id}`}
                          className={`px-3 py-1 text-xs font-bold border rounded-lg ${t.btn}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 ? (
          <div className="flex justify-between items-center mt-4 text-xs">
            <p className={t.muted}>
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`px-3 py-1.5 border rounded-lg disabled:opacity-40 ${t.btn}`}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className={`px-3 py-1.5 border rounded-lg disabled:opacity-40 ${t.btn}`}
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
