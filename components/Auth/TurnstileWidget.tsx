"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

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
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : errored ? (
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
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
