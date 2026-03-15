"use client";

import { InputHTMLAttributes, ReactNode } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional icon on the left */
  icon?: ReactNode;
  /** Optional right-side element (e.g. password visibility toggle) */
  rightElement?: ReactNode;
}

const inputBase =
  "w-full px-4 py-3 bg-[#ECECEC] border border-slate-700 text-black placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

export default function AuthInput({
  label,
  icon,
  rightElement,
  className = "",
  id,
  ...props
}: AuthInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s/g, "-");
  const hasLeftPadding = !!icon;
  const hasRightPadding = !!rightElement;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`${inputBase} ${hasLeftPadding ? "pl-10" : ""} ${hasRightPadding ? "pr-12" : ""} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
