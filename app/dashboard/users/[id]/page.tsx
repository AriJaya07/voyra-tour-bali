"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/components/Dashboard/ThemeProvider";
import AdminUserActions from "@/components/admin/AdminUserActions";
import AdminAuditTimeline from "@/components/admin/AdminAuditTimeline";

interface UserDetail {
  user: {
    id: number;
    email: string;
    name: string | null;
    role: "USER" | "ADMIN";
    phone: string | null;
    provider: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    twoFactorEnrolledAt: string | null;
    twoFactorMethod: string | null;
    twoFactorEpoch: number;
    loginAttempts: number;
    loginLockedUntil: string | null;
    createdAt: string;
  };
  security: {
    backupRemaining: number;
    trustedDevices: number;
    recentFailedMfa24h: number;
  };
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function useT(theme: "dark" | "light") {
  const dark = theme === "dark";
  return {
    page: dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900",
    card: dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
    muted: dark ? "text-gray-400" : "text-gray-500",
  };
}

export default function AdminUserDetailPage() {
  const { theme } = useTheme();
  const t = useT(theme);
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
      else toast.error("Could not load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${t.page}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  const u = data.user;
  const locked = u.loginLockedUntil && new Date(u.loginLockedUntil) > new Date();

  return (
    <div className={`min-h-screen pt-6 pb-16 px-4 sm:px-8 ${t.page}`}>
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/users" className={`text-sm ${t.muted} hover:underline mb-3 inline-block`}>
          ← Back to users
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{u.name || u.email}</h1>
            <p className={`text-sm ${t.muted}`}>{u.email} · ID #{u.id}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
          }`}>{u.role}</span>
        </div>

        <div className={`${t.card} border rounded-xl p-5 mb-4`}>
          <h2 className="font-bold mb-3">Account</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Field label="Provider" value={u.provider} t={t} />
            <Field label="Email verified" value={u.emailVerified ? "Yes" : "No"} t={t} />
            <Field label="Phone" value={u.phone || "—"} t={t} />
            <Field label="Created" value={fmt(u.createdAt)} t={t} />
            <Field label="Login attempts" value={String(u.loginAttempts)} t={t} />
            <Field
              label="Locked until"
              value={locked ? fmt(u.loginLockedUntil!) : "—"}
              t={t}
              accent={locked ? "text-amber-500" : ""}
            />
          </dl>
        </div>

        <div className={`${t.card} border rounded-xl p-5 mb-4`}>
          <h2 className="font-bold mb-3">Security</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
            <Field
              label="2FA"
              value={u.twoFactorEnabled ? `🔒 ON (${u.twoFactorMethod || "TOTP"})` : "🔓 OFF"}
              t={t}
            />
            <Field
              label="Enabled at"
              value={u.twoFactorEnrolledAt ? fmt(u.twoFactorEnrolledAt) : "—"}
              t={t}
            />
            <Field label="Epoch" value={String(u.twoFactorEpoch)} t={t} />
            <Field
              label="Backup codes"
              value={`${data.security.backupRemaining} remaining`}
              t={t}
            />
            <Field
              label="Trusted devices"
              value={String(data.security.trustedDevices)}
              t={t}
            />
            <Field
              label="Failed MFA (24h)"
              value={String(data.security.recentFailedMfa24h)}
              t={t}
              accent={data.security.recentFailedMfa24h >= 10 ? "text-red-500 font-bold" : ""}
            />
          </dl>

          <AdminUserActions
            userId={u.id}
            userEmail={u.email}
            twoFactorEnabled={u.twoFactorEnabled}
            locked={Boolean(locked)}
            trustedDevices={data.security.trustedDevices}
            onChange={load}
          />
        </div>

        <div className={`${t.card} border rounded-xl p-5`}>
          <h2 className="font-bold mb-3">Activity</h2>
          <AdminAuditTimeline userId={u.id} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, t, accent }: { label: string; value: string; t: { muted: string }; accent?: string }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${t.muted}`}>{label}</p>
      <p className={`text-sm ${accent || ""}`}>{value}</p>
    </div>
  );
}
