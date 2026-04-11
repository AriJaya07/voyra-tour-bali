export type BookingStatus = "PENDING" | "PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface BookingTraveler {
  fullName: string;
  ageBand: string;
}

export interface Booking {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
  productOptionCode?: string | null;
  productOptionTitle?: string | null;
  productImage?: string;
  totalPrice: number;
  totalPriceUsd?: number;
  currency?: string;
  travelDate: string;
  travelTime?: string;
  pax: number;
  status: BookingStatus;
  createdAt: string;
  paymentId?: string;
  snapToken?: string;
  ticketToken?: string;
  ticketImageUrl?: string;
  meetingPoint?: string;
  travelers?: BookingTraveler[];
  manualPrice?: number;
  isMockMode?: boolean;
  paidAt?: string;
}

export interface BookingStatusConfig {
  label: string;
  className: string;
  icon: string;
  description: string;
}

/**
 * Mock booking flow:
 *   PAYMENT → (user pays) → CONFIRMED → (admin uploads ticket) → COMPLETED
 *
 * Non-mock flow:
 *   PENDING → CONFIRMED → COMPLETED
 */
export const BOOKING_FLOW_ORDER: BookingStatus[] = [
  "PENDING",
  "PAYMENT",
  "CONFIRMED",
  "COMPLETED",
];

export const BOOKING_STATUS_MAP: Record<string, BookingStatusConfig> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "📝",
    description: "Booking submitted, waiting for processing",
  },
  PAYMENT: {
    label: "Payment",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "💳",
    description: "Waiting for customer payment",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "✅",
    description: "Payment received, admin booking on Viator",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: "🎉",
    description: "Booking completed, ticket available",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: "❌",
    description: "Booking has been cancelled",
  },
};

/** Dashboard dark-theme status styles */
export const BOOKING_STATUS_DARK: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  PAYMENT: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  CONFIRMED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

/**
 * Admin-side allowed status transitions.
 *
 * PAYMENT   → no manual status change (admin only sets price/time/link).
 *              Status auto-changes to CONFIRMED when user pays.
 *            → CANCELLED
 * CONFIRMED → COMPLETED (admin uploads ticket after Viator manual booking)
 *            → CANCELLED
 */
export const ADMIN_ALLOWED_TRANSITIONS: Record<string, { label: string; status: string; color: string }[]> = {
  PENDING: [
    { label: "Cancel Booking", status: "CANCELLED", color: "bg-red-600 hover:bg-red-700" },
  ],
  PAYMENT: [
    { label: "Cancel Booking", status: "CANCELLED", color: "bg-red-600 hover:bg-red-700" },
  ],
  CONFIRMED: [
    { label: "Mark Completed", status: "COMPLETED", color: "bg-green-600 hover:bg-green-700" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};
