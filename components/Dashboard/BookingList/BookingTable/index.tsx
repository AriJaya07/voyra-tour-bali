"use client";

import { Booking, BookingProvider } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";
import BookingStatusBadge from "@/components/Global/booking/BookingStatusBadge";
import { EyeIcon, SwitchIcon } from "@/components/assets/Icon/shared";
import { ADMIN_ALLOWED_TRANSITIONS } from "@/types/booking";

const PROVIDER_BADGE: Record<BookingProvider, string> = {
  LOCAL: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  VIATOR: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  TOURCMS: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};


const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

interface BookingTableProps {
  bookings: Booking[];
  isLoading: boolean;
  onView: (booking: Booking) => void;
  onStatusChange: (booking: Booking) => void;
  updatingStatus: boolean;
  onRetryCommit?: (booking: Booking) => void;
  retrying?: boolean;
}

export default function BookingTable({
  bookings,
  isLoading,
  onView,
  onStatusChange,
  onRetryCommit,
  retrying = false,
}: BookingTableProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <span className="text-5xl mb-4 block">📋</span>
        <p className="text-white font-semibold">No bookings found</p>
        <p className="text-slate-500 text-sm mt-1">
          Bookings will appear here when customers make reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {["Ref", "Provider", "Customer", "Product", "Travel Date", "Pax", "Price", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bookings.map((b) => {
              return (
                <tr
                  key={`${b._src || "booking"}-${b.id}`}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-white text-xs font-mono font-semibold truncate max-w-[120px]">
                      {b.bookingRef || "—"}
                    </p>
                    <p className="text-slate-600 text-xs">{fmtDate(b.createdAt)}</p>
                    {b.provider === "TOURCMS" && b.tourcmsBookingStatus === "FAILED" && (
                      <p className="text-rose-400 text-[10px] mt-1 font-bold">
                        commit failed ({b.tourcmsRetryCount ?? 0})
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                        PROVIDER_BADGE[b.provider || "LOCAL"]
                      }`}
                    >
                      {b.provider || "LOCAL"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-medium truncate max-w-[140px]">
                      {b.user?.name || "Unknown"}
                    </p>
                    <p className="text-slate-500 text-xs truncate max-w-[140px]">
                      {b.user?.email || b.leadEmail}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-white text-sm truncate max-w-[160px]">
                      {b.productTitle}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-sm">
                    {fmtDate(b.travelDate)}
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-sm text-center">
                    {b.pax}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-white font-bold text-sm">
                      {formatPrice(b.totalPrice)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <BookingStatusBadge status={b.status} variant="dark" />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {/* View details */}
                      <button
                        onClick={() => onView(b)}
                        title="View Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {/* Change status — only when transitions exist */}
                      {(ADMIN_ALLOWED_TRANSITIONS[b.status] || []).length > 0 && (
                        <button
                          onClick={() => onStatusChange(b)}
                          title="Change Status"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition"
                        >
                          <SwitchIcon className="w-4 h-4" />
                        </button>
                      )}

                      {b.provider === "TOURCMS" &&
                        b.tourcmsBookingStatus === "FAILED" &&
                        onRetryCommit && (
                          <button
                            disabled={retrying}
                            onClick={() => onRetryCommit(b)}
                            title="Retry TourCMS commit"
                            className="px-2 py-1 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 text-[10px] font-bold border border-amber-500/30 disabled:opacity-50 transition"
                          >
                            Retry
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
