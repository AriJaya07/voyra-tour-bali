"use client";

import { useState } from "react";
import { toast } from "sonner";
import OtpInput from "./OtpInput";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function TwoFactorDisableModal({ open, onClose, onDone }: Props) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async () => {
    if (!password || code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not disable 2FA");
        return;
      }
      toast.success("2FA disabled");
      onDone();
      onClose();
      setPassword("");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Disable two-factor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 mb-4 text-sm">
          Turning off 2FA makes your account less secure. Confirm with your password and a current 6-digit code.
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">{error}</div>
        ) : null}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] mb-3"
        />

        <p className="text-xs text-gray-500 mb-2">6-digit code from your authenticator</p>
        <div className="bg-gray-50 rounded-xl p-4">
          <OtpInput value={code} onChange={setCode} disabled={busy} invalid={Boolean(error)} />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Keep 2FA
          </button>
          <button
            onClick={submit}
            disabled={busy || !password || code.length !== 6}
            className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition"
          >
            {busy ? "…" : "Disable 2FA"}
          </button>
        </div>
      </div>
    </div>
  );
}
