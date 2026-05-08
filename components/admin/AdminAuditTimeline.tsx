"use client";

import { useCallback, useEffect, useState } from "react";

interface AuditEntry {
  id: number;
  event: string;
  ipHash: string | null;
  meta: unknown;
  createdAt: string;
  actor: { id: number; email: string; name: string | null } | null;
}

interface PageData {
  entries: AuditEntry[];
  page: number;
  totalPages: number;
  total: number;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const EVENT_LABEL: Record<string, string> = {
  "2FA_ENABLED": "Enabled 2FA",
  "2FA_DISABLED": "Disabled 2FA (self)",
  "2FA_ADMIN_RESET": "Admin reset 2FA",
  "2FA_ADMIN_DISABLED": "Admin disabled 2FA",
  "2FA_LOGIN_OK": "Signed in (2FA)",
  "2FA_LOGIN_FAIL": "Failed 2FA attempt",
  "2FA_BACKUP_USED": "Backup code used",
  "2FA_EMAIL_OTP_SENT": "Email OTP sent",
  "2FA_BACKUP_CODES_REGEN": "Regenerated backup codes",
  TRUSTED_DEVICE_ADDED: "Added trusted device",
  TRUSTED_DEVICE_REVOKED: "Revoked trusted device",
  TRUSTED_DEVICES_REVOKED_ALL: "Revoked all trusted devices",
  LOCKOUT_CLEARED: "Lockout cleared",
  ADMIN_USER_VIEW: "Admin viewed account",
  LOGIN_OK: "Signed in",
  LOGIN_FAIL: "Failed login",
  LOGIN_LOCKED: "Account locked out",
  LOGIN_CAPTCHA_FAIL: "Captcha failed",
  LOGIN_EMAIL_UNVERIFIED: "Login blocked (unverified email)",
  OAUTH_LOGIN_OK: "Signed in (Google)",
  LOGOUT: "Signed out",
  RETENTION_RUN: "Retention sweep",
};

const EVENT_TONE: Record<string, string> = {
  "2FA_LOGIN_FAIL": "text-red-500",
  "2FA_ADMIN_RESET": "text-amber-500",
  "2FA_ADMIN_DISABLED": "text-red-500",
  "2FA_BACKUP_USED": "text-amber-500",
  "2FA_ENABLED": "text-emerald-500",
  "2FA_LOGIN_OK": "text-emerald-500",
  LOGIN_OK: "text-emerald-500",
  OAUTH_LOGIN_OK: "text-emerald-500",
  LOGIN_FAIL: "text-red-500",
  LOGIN_LOCKED: "text-amber-500",
  LOGIN_CAPTCHA_FAIL: "text-amber-500",
  LOGIN_EMAIL_UNVERIFIED: "text-amber-500",
  LOGOUT: "text-slate-400",
};

interface Props {
  userId: number;
}

export default function AdminAuditTimeline({ userId }: Props) {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/admin/users/${userId}/audit`, window.location.origin);
      url.searchParams.set("page", String(page));
      if (eventFilter) url.searchParams.set("event", eventFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [userId, page, eventFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <select
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setPage(1);
          }}
          className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
        >
          <option value="">All events</option>
          <option value="LOGIN_OK">Sign-ins (success)</option>
          <option value="LOGIN_FAIL">Sign-ins (failed)</option>
          <option value="LOGIN_LOCKED">Lockouts</option>
          <option value="OAUTH_LOGIN_OK">Google sign-ins</option>
          <option value="LOGOUT">Sign-outs</option>
          <option value="2FA_LOGIN_FAIL">Failed 2FA only</option>
          <option value="2FA_LOGIN_OK">Successful 2FA only</option>
          <option value="2FA_ADMIN_RESET">Admin resets</option>
          <option value="TRUSTED_DEVICE_ADDED">Trusted device adds</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !data?.entries.length ? (
        <p className="text-sm text-gray-400">No events recorded.</p>
      ) : (
        <ul className="divide-y divide-gray-200/30">
          {data.entries.map((e) => (
            <li key={e.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className={`font-bold ${EVENT_TONE[e.event] || ""}`}>
                  {EVENT_LABEL[e.event] || e.event}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmt(e.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {e.actor ? <>by {e.actor.email} · </> : null}
                {e.ipHash ? <>IP fp {e.ipHash.slice(0, 8)}</> : null}
                {e.meta && Object.keys(e.meta as object).length > 0 ? (
                  <span className="ml-2 font-mono">{JSON.stringify(e.meta)}</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 ? (
        <div className="flex justify-between items-center mt-3 text-xs">
          <p className="text-gray-400">
            Page {data.page} of {data.totalPages} · {data.total} events
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
