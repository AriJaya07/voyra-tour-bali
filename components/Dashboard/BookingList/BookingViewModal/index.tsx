"use client";

import { useState, useRef } from "react";
import { Booking, bookingService } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";
import { toast } from "sonner";

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
  booking: initialBooking,
  onClose,
  onUpdateStatus,
  updatingStatus,
}: BookingViewModalProps) {
  const [booking, setBooking] = useState(initialBooking);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transitions = ALLOWED_TRANSITIONS[booking.status] || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await bookingService.uploadTicket(booking.id, file);
      if (res.success) {
        setBooking((prev) => ({ ...prev, ticketImageUrl: res.ticketImageUrl }));
        toast.success("Ticket image uploaded successfully!");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to upload ticket");
    } finally {
      setUploading(false);
    }
  };

  const isConfirmDisabled = (status: string) => {
    if (status === "CONFIRMED") {
      return updatingStatus || uploading || !booking.ticketImageUrl;
    }
    return updatingStatus || uploading;
  };

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
              <Section title={booking.status === "PENDING" ? "Ticket & Status" : "Update Status"}>
                {booking.status === "PENDING" && (
                  <div className="mb-4 space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Upload Viator Ticket (Required to Confirm)
                    </label>
                    <div className="flex items-center gap-4">
                      {booking.ticketImageUrl ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
                          <img
                            src={booking.ticketImageUrl}
                            alt="Ticket"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition text-[10px] text-white font-bold"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 flex flex-col items-center justify-center gap-1 transition text-slate-500 hover:text-slate-400 bg-slate-800/50"
                        >
                          <span className="text-xl">📸</span>
                          <span className="text-[10px] font-bold uppercase">Upload</span>
                        </button>
                      )}
                      <div className="flex-1">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Please upload the official Viator/Supplier ticket image. 
                          This will be visible to the user in their dashboard.
                        </p>
                        {uploading && (
                          <div className="mt-2 flex items-center gap-2 text-violet-400 text-[10px] font-bold uppercase tracking-widest">
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => (
                    <button
                      key={t.status}
                      onClick={() => onUpdateStatus(booking.id, t.status)}
                      disabled={isConfirmDisabled(t.status)}
                      className={`px-4 py-2 ${t.color} text-white text-sm font-bold rounded-xl transition disabled:opacity-40 shadow-lg shadow-black/20`}
                    >
                      {updatingStatus ? "Updating..." : t.label}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* Ticket Image Preview (if confirmed/completed) */}
            {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && booking.ticketImageUrl && (
               <Section title="Confirmed Ticket">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 group">
                    <img
                      src={booking.ticketImageUrl}
                      alt="Ticket"
                      className="w-full h-auto max-h-[300px] object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                       <a 
                        href={booking.ticketImageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-100 transition"
                       >
                         View Full
                       </a>
                       <button
                         onClick={() => fileInputRef.current?.click()}
                         className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition"
                       >
                         Replace
                       </button>
                    </div>
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
