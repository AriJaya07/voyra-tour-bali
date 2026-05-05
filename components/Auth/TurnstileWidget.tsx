"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircleIcon, AlertIcon, ShieldIcon } from "@/components/assets/Icon/shared";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  resetKey?: number;
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const [verified, setVerified] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleVerify = (token: string) => {
    setVerified(true);
    setErrored(false);
    onVerify(token);
  };

  const handleExpire = () => {
    setVerified(false);
    onExpire?.();
  };

  const handleError = () => {
    setVerified(false);
    setErrored(true);
    onError?.();
  };

  return (
    <div>
      {/* Label — matches AuthInput label style */}
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        Security Verification
      </label>

      {/* Container — matches AuthInput border + shape */}
      <div
        className={`w-full rounded-xl border transition-all duration-200 overflow-hidden ${
          errored
            ? "border-red-500/60 bg-red-950/20"
            : verified
            ? "border-emerald-500/60 bg-emerald-950/20"
            : "border-slate-700 bg-[#ECECEC]/10"
        }`}
      >
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              errored
                ? "bg-red-500/20"
                : verified
                ? "bg-emerald-500/20"
                : "bg-indigo-500/20"
            }`}
          >
            {verified ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
            ) : errored ? (
              <AlertIcon className="w-4 h-4 text-red-400" />
            ) : (
              <ShieldIcon className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${verified ? "text-emerald-400" : errored ? "text-red-400" : "text-slate-300"}`}>
              {verified ? "Verification complete" : errored ? "Verification failed — try again" : "Confirm you're human"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Protected by Cloudflare Turnstile
            </p>
          </div>
        </div>

        {/* Turnstile widget */}
        <div className="pb-3">
          <Turnstile
            key={resetKey}
            siteKey={process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY!}
            onSuccess={handleVerify}
            onExpire={handleExpire}
            onError={handleError}
            style={{ width: "100%" }}
            options={{ theme: "dark", size: "flexible" }}
          />
        </div>
      </div>
    </div>
  );
}
