"use client";

import { BOOKING_STATUS_MAP, BOOKING_STATUS_DARK } from "@/types/booking";

interface BookingStatusBadgeProps {
  status: string;
  variant?: "light" | "dark";
  size?: "sm" | "md";
  showIcon?: boolean;
}

export default function BookingStatusBadge({
  status,
  variant = "light",
  size = "sm",
  showIcon = false,
}: BookingStatusBadgeProps) {
  const config = BOOKING_STATUS_MAP[status];
  if (!config) return null;

  const darkStyle = BOOKING_STATUS_DARK[status] || BOOKING_STATUS_DARK.PENDING;

  const sizeClass = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClass} ${
        variant === "dark" ? darkStyle : config.className
      }`}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  );
}
