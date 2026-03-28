"use client";

import { useState, useEffect, useCallback } from "react";

interface HoldTimerProps {
  /** ISO timestamp when the hold expires */
  expiration: string;
  /** Called when the timer reaches 0 */
  onExpired: () => void;
}

export default function HoldTimer({ expiration, onExpired }: HoldTimerProps) {
  const calcRemaining = useCallback(() => {
    const diff = new Date(expiration).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }, [expiration]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    setRemaining(calcRemaining());

    const interval = setInterval(() => {
      const secs = calcRemaining();
      setRemaining(secs);

      if (secs <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining, onExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 120; // last 2 minutes
  const isCritical = remaining <= 60; // last 60 seconds

  if (remaining <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-red-800">Hold Expired</p>
          <p className="text-xs text-red-600">Your booking hold has expired. Please start over.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 flex items-center gap-3 border transition-colors ${
        isCritical
          ? "bg-red-50 border-red-200"
          : isUrgent
          ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isCritical
            ? "bg-red-100"
            : isUrgent
            ? "bg-amber-100"
            : "bg-blue-100"
        }`}
      >
        <svg
          className={`w-4 h-4 ${
            isCritical
              ? "text-red-600"
              : isUrgent
              ? "text-amber-600"
              : "text-blue-600"
          } ${isCritical ? "animate-pulse" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div className="flex-1">
        <p
          className={`text-xs font-bold uppercase tracking-wider ${
            isCritical
              ? "text-red-700"
              : isUrgent
              ? "text-amber-700"
              : "text-blue-700"
          }`}
        >
          Booking hold expires in
        </p>
        <p
          className={`text-lg font-black tabular-nums ${
            isCritical
              ? "text-red-800"
              : isUrgent
              ? "text-amber-800"
              : "text-blue-800"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </p>
      </div>

      {/* Progress arc (visual only) */}
      <div className="w-10 h-10 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path
            className="text-gray-200"
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className={
              isCritical
                ? "text-red-500"
                : isUrgent
                ? "text-amber-500"
                : "text-blue-500"
            }
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${(remaining / 900) * 100}, 100`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
