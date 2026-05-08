"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import BackLink from "@/components/common/BackLink";
import TwoFactorEnrollModal from "@/components/security/TwoFactorEnrollModal";
import TwoFactorDisableModal from "@/components/security/TwoFactorDisableModal";
import RegenerateBackupCodesModal from "@/components/security/RegenerateBackupCodesModal";
import TrustedDevicesList from "@/components/security/TrustedDevicesList";

interface Status {
  enabled: boolean;
  enrolledAt: string | null;
  method: string | null;
  provider: string;
  backupRemaining: number;
  trustedDevices: number;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function SecurityPage() {
  const { status: sessionStatus } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/status", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") return;
    void load();
  }, [sessionStatus, load]);

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to manage security</h1>
          <Link href="/login" className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isGoogleOnly = status?.provider === "google";

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-row items-center gap-4 mb-2 flex-wrap">
          <BackLink href="/profile" label="Back to profile" />
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Manage password, two-factor authentication, and trusted devices.
        </p>

        {/* Password */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Password</h2>
              <p className="text-xs text-gray-500 mt-0.5">Use a strong, unique password.</p>
            </div>
            <Link
              href="/forgot-password"
              className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              Change
            </Link>
          </div>
        </div>

        {/* 2FA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900">Two-factor authentication</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add a 6-digit code from an authenticator app at sign-in.
              </p>
            </div>
            <span
              className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${
                status?.enabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {status?.enabled ? "🔒 ON" : "🔓 OFF"}
            </span>
          </div>

          {isGoogleOnly && !status?.enabled ? (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 text-xs mb-3">
              You sign in with Google. Two-factor authentication is managed in your Google account settings.
            </div>
          ) : null}

          {status?.enabled ? (
            <>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li>Method: <strong>Authenticator app (TOTP)</strong></li>
                {status.enrolledAt ? <li>Enabled: {fmtDate(status.enrolledAt)}</li> : null}
                <li>
                  Backup codes: <strong>{status.backupRemaining}</strong> of 10 remaining
                  {status.backupRemaining <= 3 ? (
                    <span className="ml-2 text-amber-700 text-xs">— low, regenerate soon</span>
                  ) : null}
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRegenOpen(true)}
                  className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  Regenerate codes
                </button>
                <button
                  onClick={() => setDisableOpen(true)}
                  className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                  Disable 2FA
                </button>
              </div>
            </>
          ) : !isGoogleOnly ? (
            <button
              onClick={() => setEnrollOpen(true)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition shadow-sm"
            >
              Enable 2FA
            </button>
          ) : null}
        </div>

        {/* Trusted devices */}
        {status?.enabled ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-4">
            <h2 className="font-bold text-gray-900 mb-1">Trusted devices</h2>
            <p className="text-xs text-gray-500 mb-3">
              These devices skip the 2FA prompt for 30 days.
            </p>
            <TrustedDevicesList />
          </div>
        ) : null}
      </div>

      <TwoFactorEnrollModal open={enrollOpen} onClose={() => setEnrollOpen(false)} onComplete={load} />
      <TwoFactorDisableModal open={disableOpen} onClose={() => setDisableOpen(false)} onDone={load} />
      <RegenerateBackupCodesModal open={regenOpen} onClose={() => setRegenOpen(false)} onDone={load} />
    </div>
  );
}
