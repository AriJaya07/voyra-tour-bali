"use client";

import { useEffect, useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoSubmit?: () => void;
  disabled?: boolean;
  invalid?: boolean;
}

export default function OtpInput({
  value,
  onChange,
  length = 6,
  autoSubmit,
  disabled,
  invalid,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmittedRef = useRef<string>("");

  useEffect(() => {
    if (value.length !== length) {
      if (value.length < length) lastSubmittedRef.current = "";
      return;
    }
    if (lastSubmittedRef.current === value) return;
    lastSubmittedRef.current = value;
    autoSubmit?.();
  }, [value, length, autoSubmit]);

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[idx] = digit || "";
    const joined = arr.join("").slice(0, length);
    onChange(joined);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-11 h-14 text-center text-xl font-bold text-white bg-slate-900/60 border rounded-lg focus:outline-none focus:ring-2 ${
            invalid ? "border-red-500 ring-red-500/40" : "border-slate-700 focus:ring-indigo-500"
          } disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
