"use client";

import { Booking } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  CONFIRMED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

const ALLOWED_TRANSITIONS: Record<string, { label: string; status: string; color: string }[]> = {
  PENDING: [
    { label: "Confirm Booking", status: "CONFIRMED", color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Cancel Booking", status: "CANCELLED", color: "bg-red-600 hover:bg-red-700" },
  ],
  CONFIRMED: [
    { label: "Mark Completed", status: "COMPLETED", color: "bg-green-600 hover:bg-green-700" },
    { label: "Cancel Booking", status: "CANCELLED", color: "bg-red-600 hover:bg-red-700" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface BookingViewModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  updatingStatus: boolean;
}

export default function BookingViewModal({
  booking,
  onClose,
  onUpdateStatus,
  updatingStatus,
}: BookingViewModalProps) {
  const transitions = ALLOWED_TRANSITIONS[booking.status] || [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-white font-bold text-lg">Booking Details</h2>
              <p className="text-slate-500 text-xs font-mono mt-0.5">
                {booking.bookingRef || `ID: ${booking.id}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  STATUS_STYLES[booking.status]
                }`}
              >
                {booking.status}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Customer */}
            <Section title="Customer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {booking.user?.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {booking.user?.name || "Unknown"}
                  </p>
                  <p className="text-slate-500 text-xs">{booking.user?.email}</p>
                </div>
              </div>
            </Section>

            {/* Product */}
            <Section title="Product">
              <InfoRow label="Title" value={booking.productTitle} />
              <InfoRow label="Product Code" value={booking.productCode} mono />
            </Section>

            {/* Booking Info */}
            <Section title="Booking Info">
              <InfoRow label="Travel Date" value={fmtDate(booking.travelDate)} />
              <InfoRow label="Guests" value={`${booking.pax} person(s)`} />
              <InfoRow label="Total Price" value={formatPrice(booking.totalPrice)} highlight />
              <InfoRow label="Booked At" value={fmtDateTime(booking.createdAt)} />
            </Section>

            {/* Payment */}
            <Section title="Payment">
              <InfoRow label="Payment ID" value={booking.paymentId || "—"} mono />
              <InfoRow
                label="Paid At"
                value={booking.paidAt ? fmtDateTime(booking.paidAt) : "Not yet paid"}
              />
            </Section>

            {/* Status Actions */}
            {transitions.length > 0 && (
              <Section title="Update Status">
                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => (
                    <button
                      key={t.status}
                      onClick={() => onUpdateStatus(booking.id, t.status)}
                      disabled={updatingStatus}
                      className={`px-4 py-2 ${t.color} text-white text-sm font-bold rounded-xl transition disabled:opacity-40`}
                    >
                      {updatingStatus ? "Updating..." : t.label}
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-sm">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight ? "text-violet-400 font-bold" : "text-white"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
