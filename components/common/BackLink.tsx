"use client";

import { useRouter } from "next/navigation";
import ChevronLeftIcon from "@/components/assets/Icon/shared/ChevronLeftIcon";

interface Props {
  /** Fallback path when no browser history (direct landings, new tab). */
  href?: string;
  /** Accessible label. Defaults to "Go back". */
  label?: string;
  /** Show text label next to icon. Default false (icon-only). */
  showLabel?: boolean;
  className?: string;
}

export default function BackLink({
  href = "/",
  label = "Go back",
  showLabel = false,
  className = "",
}: Props) {
  const router = useRouter();

  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(href);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group inline-flex items-center justify-center gap-1.5 ${
        showLabel ? "px-3 py-1.5" : "h-9 w-9"
      } text-gray-600 bg-white border border-gray-200 hover:border-[#0071CE] hover:text-[#0071CE] rounded-full transition shadow-sm ${className}`}
    >
      <ChevronLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {showLabel ? <span className="text-xs font-bold">{label}</span> : null}
    </button>
  );
}
