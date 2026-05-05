"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { HiSparkles } from "react-icons/hi2";
import { useAiWallet } from "@/utils/hooks/useAiWallet";

interface Props {
  className?: string;
  /** When true, suppress the link and only show the count (used inside widgets). */
  inline?: boolean;
  /** Polling interval in ms. Set to 0 to disable. */
  refetchInterval?: number;
}

/**
 * Compact pill showing the user's AI credit balance.
 * Hidden for guests. Click → /profile/ai.
 */
export default function AiCreditBadge({ className = "", inline = false, refetchInterval = 0 }: Props) {
  const { status } = useSession();
  const enabled = status === "authenticated";
  const { data, isLoading } = useAiWallet({ enabled, refetchInterval });

  if (!enabled) return null;

  const balance = data?.balance ?? 0;
  const planLabel = data?.planLabel ?? "Free";
  const expiringSoon = (data?.expiringIn7d ?? 0) > 0;

  const body = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition
        ${expiringSoon
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-blue-200 bg-blue-50 text-blue-700"}
        ${className}`}
      title={
        expiringSoon
          ? `${data?.expiringIn7d} credits expiring in 7 days`
          : `${balance} credits · ${planLabel}`
      }
    >
      <HiSparkles className="h-3.5 w-3.5" aria-hidden />
      {isLoading ? "…" : balance.toLocaleString()}
      <span className="opacity-60 font-normal">credits</span>
    </span>
  );

  if (inline) return body;

  return (
    <Link href="/ai/wallet" className="inline-flex">
      {body}
    </Link>
  );
}
