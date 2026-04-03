"use client";

import { clsx, type ClassValue } from "clsx";
import SpinnerIcon from "../assets/dashboard/SpinnerIcon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "viator" | "auth";
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const VARIANTS = {
  primary:
    "bg-[#0071CE] hover:bg-[#005ba6] text-white shadow-md",
  secondary:
    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  viator:
    "bg-[#2D9B1B] hover:bg-[#257A15] text-white shadow-md",
  auth:
    "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40 hover:brightness-110",
};

export default function Button({
  variant = "primary",
  isLoading = false,
  loadingText = "Processing...",
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        // Base styles - very stable for Safari
        "flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-[background-color,background-image,border-color,color,box-shadow,transform,filter] duration-200 transform-gpu translate-z-0 leading-6 active:scale-[0.98]",
        // Sizing - default to full and h-12 but allow override
        "w-full h-12 py-3 px-4 shadow-sm",
        // Variant styles
        isDisabled ? "bg-gray-300 cursor-not-allowed text-white shadow-none" : VARIANTS[variant],
        // Custom overrides
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 animate-in fade-in duration-300">
          <SpinnerIcon className="w-4 h-4" />
          <span className="opacity-90">{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 animate-in fade-in duration-300">
          {children}
        </div>
      )}
    </button>
  );
}
