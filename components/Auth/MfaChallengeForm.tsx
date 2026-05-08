"use client";

import { useEffect, useState } from "react";
import OtpInput from "@/components/security/OtpInput";
import Button from "@/components/ui/Button";
import { LockIcon } from "@/components/assets/Icon/shared";

type Method = "TOTP" | "BACKUP" | "EMAIL_OTP";

interface Props {
  challengeId: number;
  methods: Method[];
  onSuccess: (mfaToken: string) => void;
  onCancel: () => void;
}

export default function MfaChallengeForm({ challengeId, methods, onSuccess, onCancel }: Props) {
  const [method, setMethod] = useState<Method>("TOTP");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    setError("");
  }, [method]);

  const sendEmailOtp = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send code");
        return;
      }
      setEmailSent(true);
      setResendCooldown(60);
      setMethod("EMAIL_OTP");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (overrideCode?: string) => {
    const submitCode = method === "BACKUP" ? backupCode : (overrideCode ?? code);
    if (!submitCode) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          method,
          code: submitCode,
          trustDevice: trust,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error === "EXHAUSTED") {
          setError("Too many wrong codes. Cancel and start over.");
        } else if (data.error === "EXPIRED") {
          setError("Code expired. Cancel and start over.");
        } else {
          setError("Invalid code. Try again.");
        }
        setCode("");
        return;
      }
      onSuccess(data.mfaToken);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300">
          <LockIcon className="w-4 h-4" />
        </div>
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          One more step
        </h2>
      </div>
      <p className="text-slate-300 text-sm mb-5">
        {method === "TOTP" && "Open your authenticator app and enter the 6-digit code."}
        {method === "EMAIL_OTP" && (emailSent ? "We emailed a 6-digit code. Enter it below." : "We can email you a one-time code.")}
        {method === "BACKUP" && "Enter one of your saved backup codes."}
      </p>

      {error ? (
        <div className="bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm text-center">
          {error}
        </div>
      ) : null}

      {method === "BACKUP" ? (
        <div className="space-y-3">
          <input
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            placeholder="XXXXX-XXXXX"
            className="w-full h-12 text-center text-lg font-mono text-white bg-slate-900/60 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest uppercase"
            autoFocus
          />
          <p className="text-xs text-slate-400 text-center">
            Codes look like <span className="font-mono">A1B2C-3D4E5</span>. Single-use.
          </p>
        </div>
      ) : method === "EMAIL_OTP" && !emailSent ? (
        <Button type="button" variant="auth" onClick={sendEmailOtp} isLoading={busy}>
          Send code to my email
        </Button>
      ) : (
        <OtpInput
          value={code}
          onChange={setCode}
          autoSubmit={() => verify(undefined)}
          disabled={busy}
          invalid={Boolean(error)}
        />
      )}

      <label className="flex items-center gap-2 mt-5 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={trust}
          onChange={(e) => setTrust(e.target.checked)}
          className="rounded border-slate-600 bg-slate-900"
        />
        Trust this device for 30 days
      </label>

      {(method !== "EMAIL_OTP" || emailSent) && method !== "BACKUP" ? null : null}

      <div className="mt-5 space-y-3">
        {method === "BACKUP" ? (
          <Button
            type="button"
            variant="auth"
            onClick={() => verify(undefined)}
            isLoading={busy}
            disabled={backupCode.length < 10}
          >
            Verify
          </Button>
        ) : null}
        {method === "EMAIL_OTP" && emailSent ? (
          <button
            type="button"
            disabled={resendCooldown > 0 || busy}
            onClick={sendEmailOtp}
            className="block w-full text-center text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email code"}
          </button>
        ) : null}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-700/50 space-y-2 text-center text-xs">
        <p className="text-slate-400 mb-2">Trouble?</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {methods.includes("TOTP") && method !== "TOTP" ? (
            <button onClick={() => setMethod("TOTP")} className="text-indigo-400 hover:text-indigo-300">
              Use authenticator app
            </button>
          ) : null}
          {methods.includes("BACKUP") && method !== "BACKUP" ? (
            <button onClick={() => setMethod("BACKUP")} className="text-indigo-400 hover:text-indigo-300">
              Use backup code
            </button>
          ) : null}
          {methods.includes("EMAIL_OTP") && method !== "EMAIL_OTP" ? (
            <button onClick={() => setMethod("EMAIL_OTP")} className="text-indigo-400 hover:text-indigo-300">
              Email me a code
            </button>
          ) : null}
        </div>
        <button
          onClick={onCancel}
          className="block w-full mt-3 text-slate-500 hover:text-slate-300"
        >
          Cancel and sign in again
        </button>
      </div>
    </div>
  );
}
