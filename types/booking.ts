export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface BookingTraveler {
  fullName: string;
  ageBand: string;
}

export interface Booking {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
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
  ticketToken?: string;
  meetingPoint?: string;
  travelers?: BookingTraveler[];
}

export interface BookingStatusConfig {
  label: string;
  className: string;
}

export const BOOKING_STATUS_MAP: Record<string, BookingStatusConfig> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
};
