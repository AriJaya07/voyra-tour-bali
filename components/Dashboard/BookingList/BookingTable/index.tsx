"use client";

import { Booking } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  CONFIRMED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

const NEXT_STATUS: Record<string, { label: string; status: string } | null> = {
  PENDING: { label: "Confirm", status: "CONFIRMED" },
  CONFIRMED: { label: "Complete", status: "COMPLETED" },
  COMPLETED: null,
  CANCELLED: null,
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
  onUpdateStatus: (id: number, status: string) => void;
  updatingStatus: boolean;
}

export default function BookingTable({
  bookings,
  isLoading,
  onView,
  onUpdateStatus,
  updatingStatus,
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
              {["Ref", "Customer", "Product", "Travel Date", "Pax", "Price", "Status", "Actions"].map(
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
              const nextAction = NEXT_STATUS[b.status];
              return (
                <tr
                  key={b.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-white text-xs font-mono font-semibold truncate max-w-[120px]">
                      {b.bookingRef || "—"}
                    </p>
                    <p className="text-slate-600 text-xs">{fmtDate(b.createdAt)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-medium truncate max-w-[140px]">
                      {b.user?.name || "Unknown"}
                    </p>
                    <p className="text-slate-500 text-xs truncate max-w-[140px]">
                      {b.user?.email}
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
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        STATUS_STYLES[b.status] || STATUS_STYLES.PENDING
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView(b)}
                        title="View"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>

                      {nextAction && (
                        <button
                          onClick={() => onUpdateStatus(b.id, nextAction.status)}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-400 text-xs font-semibold hover:bg-violet-500/25 transition disabled:opacity-40"
                        >
                          {nextAction.label}
                        </button>
                      )}

                      {b.status === "PENDING" && (
                        <button
                          onClick={() => onUpdateStatus(b.id, "CANCELLED")}
                          disabled={updatingStatus}
                          title="Cancel"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
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
