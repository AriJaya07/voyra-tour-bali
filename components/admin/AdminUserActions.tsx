"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  userId: number;
  userEmail: string;
  twoFactorEnabled: boolean;
  locked: boolean;
  trustedDevices: number;
  onChange: () => void;
}

type ActionKind = "reset" | "disable" | null;

export default function AdminUserActions({
  userId,
  userEmail,
  twoFactorEnabled,
  locked,
  trustedDevices,
  onChange,
}: Props) {
  const [pendingAction, setPendingAction] = useState<ActionKind>(null);
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const closeModal = () => {
    setPendingAction(null);
    setReason("");
    setConfirmEmail("");
  };

  const submitDestructive = async () => {
    if (confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      toast.error("Email confirmation does not match");
      return;
    }
    setBusy(true);
    try {
      const path =
        pendingAction === "reset"
          ? `/api/admin/users/${userId}/2fa/reset`
          : `/api/admin/users/${userId}/2fa/disable`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(pendingAction === "reset" ? "2FA reset — user must re-enroll" : "2FA disabled");
      closeModal();
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const clearLockout = async () => {
    if (!confirm("Clear lockout for this user?")) return;
    const res = await fetch(`/api/admin/users/${userId}/lockout/clear`, { method: "POST" });
    if (res.ok) {
      toast.success("Lockout cleared");
      onChange();
    } else toast.error("Could not clear lockout");
  };

  const revokeTrusted = async () => {
    if (!confirm("Revoke all trusted devices? They'll need 2FA next sign-in.")) return;
    const res = await fetch(`/api/admin/users/${userId}/trusted-devices/revoke`, { method: "POST" });
    if (res.ok) {
      toast.success("Trusted devices revoked");
      onChange();
    } else toast.error("Could not revoke");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {twoFactorEnabled ? (
          <>
            <button
              onClick={() => setPendingAction("reset")}
              className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
            >
              Reset 2FA
            </button>
            <button
              onClick={() => setPendingAction("disable")}
              className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Disable 2FA
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-400">2FA off — no security actions available</span>
        )}
        {locked ? (
          <button
            onClick={clearLockout}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Clear lockout
          </button>
        ) : null}
        {trustedDevices > 0 ? (
          <button
            onClick={revokeTrusted}
            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            Revoke {trustedDevices} trusted device{trustedDevices > 1 ? "s" : ""}
          </button>
        ) : null}
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-gray-900">
            <h3 className="text-lg font-bold mb-2">
              {pendingAction === "reset" ? "Reset 2FA" : "Disable 2FA"}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {pendingAction === "reset"
                ? "User loses 2FA setup and must re-enroll on next sign-in. Backup codes and trusted devices are wiped."
                : "User can sign in with password only. Backup codes and trusted devices are wiped. Use only when user explicitly cannot use 2FA."}
            </p>

            <label className="block text-xs font-bold text-gray-500 mb-1">
              Reason (logged in audit trail)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. User lost phone, contacted support 2026-05-08"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] mb-3"
            />

            <label className="block text-xs font-bold text-gray-500 mb-1">
              Type the user&apos;s email to confirm
            </label>
            <input
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={userEmail}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] mb-4 font-mono"
            />

            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={submitDestructive}
                disabled={busy || confirmEmail.toLowerCase() !== userEmail.toLowerCase()}
                className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition disabled:opacity-50 ${
                  pendingAction === "reset" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy ? "…" : pendingAction === "reset" ? "Reset 2FA" : "Disable 2FA"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
