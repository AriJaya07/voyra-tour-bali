"use client";

import { useState } from "react";
import OtpInput from "./OtpInput";
import BackupCodesPanel from "./BackupCodesPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function RegenerateBackupCodesModal({ open, onClose, onDone }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/backup-codes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not regenerate");
        setCode("");
        return;
      }
      setCodes(data.backupCodes);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setCode("");
    setCodes(null);
    setError("");
    onClose();
    if (codes) onDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {codes ? "New backup codes" : "Regenerate backup codes"}
          </h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {!codes ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Old codes will stop working immediately. Confirm with a 6-digit code from your authenticator.
            </p>
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
                {error}
              </div>
            ) : null}
            <div className="bg-gray-50 rounded-xl p-4">
              <OtpInput value={code} onChange={setCode} autoSubmit={submit} disabled={busy} invalid={Boolean(error)} />
            </div>
            <button
              onClick={submit}
              disabled={busy || code.length !== 6}
              className="block w-full mt-4 px-4 py-3 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-50 rounded-xl transition"
            >
              {busy ? "…" : "Regenerate"}
            </button>
          </>
        ) : (
          <BackupCodesPanel codes={codes} onConfirm={close} confirmLabel="I saved them — close" />
        )}
      </div>
    </div>
  );
}
