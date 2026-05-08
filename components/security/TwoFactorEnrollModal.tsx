"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import OtpInput from "./OtpInput";
import BackupCodesPanel from "./BackupCodesPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = "password" | "qr" | "backup";

export default function TwoFactorEnrollModal({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<string>("");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const reset = () => {
    setStep("password");
    setPassword("");
    setSecret("");
    setOtpauthUrl("");
    setCode("");
    setBackupCodes([]);
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submitPassword = async () => {
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/enroll/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start enrollment");
        return;
      }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStep("qr");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (override?: string) => {
    const submit = override ?? code;
    if (submit.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/enroll/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Code invalid");
        setCode("");
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setStep("backup");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/enroll/finalize", {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not finish enrollment");
        return;
      }
      toast.success("2FA enabled");
      onComplete();
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Enable two-factor authentication</h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          {(["password", "qr", "backup"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${
                ["password", "qr", "backup"].indexOf(step) >= i ? "bg-[#0071CE]" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        ) : null}

        {step === "password" ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              For your security, confirm your password to continue.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Current password"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
            />
            <button
              onClick={submitPassword}
              disabled={busy || !password}
              className="block w-full mt-4 px-4 py-3 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-50 rounded-xl transition"
            >
              {busy ? "…" : "Continue"}
            </button>
          </>
        ) : null}

        {step === "qr" ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Scan this QR code with Google Authenticator, Authy, or 1Password. Then enter the 6-digit code below.
            </p>
            <div className="flex justify-center bg-white border-2 border-gray-100 rounded-xl p-4 mb-3">
              {otpauthUrl ? <QRCodeSVG value={otpauthUrl} size={180} /> : null}
            </div>
            <details className="mb-4 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-800">Can&apos;t scan? Show secret</summary>
              <div className="mt-2 font-mono bg-gray-50 border border-gray-200 rounded p-2 break-all text-gray-700">
                {secret}
              </div>
            </details>
            <div className="bg-gray-50 rounded-xl p-4">
              <OtpInput
                value={code}
                onChange={setCode}
                autoSubmit={() => submitCode(undefined)}
                disabled={busy}
                invalid={Boolean(error)}
              />
            </div>
            <button
              onClick={() => submitCode(undefined)}
              disabled={busy || code.length !== 6}
              className="block w-full mt-4 px-4 py-3 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-50 rounded-xl transition"
            >
              {busy ? "…" : "Verify"}
            </button>
          </>
        ) : null}

        {step === "backup" ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Last step — save these backup codes. They&apos;re your way back in if you lose your phone.
            </p>
            <BackupCodesPanel
              codes={backupCodes}
              onConfirm={finalize}
              confirmLabel={busy ? "…" : "I saved them — finish"}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
