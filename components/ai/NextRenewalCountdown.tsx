"use client";

import { useEffect, useState } from "react";

interface Props {
  /** ISO date string */
  at: string;
  /** Optional prefix text. Default: "Renews in" */
  label?: string;
  className?: string;
}

function formatDelta(ms: number): string {
  if (ms <= 0) return "any moment now";
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86_400);
  if (days >= 2) return `${days} days`;
  const hours = Math.floor(seconds / 3_600);
  if (hours >= 2) return `${hours} hours`;
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 2) return `${minutes} minutes`;
  return `${seconds}s`;
}

/**
 * Live countdown to a future timestamp. Used on /profile/ai for "Renews in 12 days"
 * + admin dashboard. Re-renders once a minute.
 */
export default function NextRenewalCountdown({ at, label = "Renews in", className = "" }: Props) {
  const target = new Date(at).getTime();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className}>
      {label} <span className="font-semibold">{formatDelta(target - tick)}</span>
    </span>
  );
}
