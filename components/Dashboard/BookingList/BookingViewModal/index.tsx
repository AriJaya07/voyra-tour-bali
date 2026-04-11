"use client";

import { useState, useRef } from "react";
import { Booking, bookingService } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";
import { toast } from "sonner";
import { FaCopy } from "react-icons/fa";
import BookingStatusBadge from "@/components/Global/booking/BookingStatusBadge";
import BookingFlowSteps from "@/components/Global/booking/BookingFlowSteps";
import { ADMIN_ALLOWED_TRANSITIONS } from "@/types/booking";
import type { BookingStatus } from "@/types/booking";

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
  onUpdateStatus: (id: number, status: string, payload?: { manualPrice?: number; travelTime?: string }) => void;
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
  const [manualPriceInput, setManualPriceInput] = useState(
    booking.manualPrice ? String(booking.manualPrice) : ""
  );
  const [manualTimeInput, setManualTimeInput] = useState(
    booking.travelTime || ""
  );
  const [savingPrice, setSavingPrice] = useState(false);

  const transitions = ADMIN_ALLOWED_TRANSITIONS[booking.status] || [];

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

  const handleSetManualPrice = async () => {
    const price = parseFloat(manualPriceInput);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    if (!manualTimeInput) {
      toast.error("Please enter a travel time.");
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/set-manual-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualPrice: price,
          travelTime: manualTimeInput,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set price/time");
      }
      setBooking((prev) => ({
        ...prev,
        manualPrice: price,
        travelTime: manualTimeInput,
      }));
      toast.success("Price and time saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save details");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleCopyPaymentLink = () => {
    const url = `${window.location.origin}/payment/manual/${booking.bookingRef}`;
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied to clipboard!");
  };

  const isActionDisabled = (targetStatus: string) => {
    if (targetStatus === "COMPLETED") {
      return updatingStatus || uploading || !booking.ticketImageUrl;
    }
    return updatingStatus || uploading;
  };

  // Travelers data for admin to copy for Viator manual booking
  const travelersJson = (booking as any).travelersJson as any[] | null;
  const paxMixJson = (booking as any).paxMixJson as any[] | null;

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
              <BookingStatusBadge status={booking.status} variant="dark" size="md" showIcon />
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
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Flow Steps */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Booking Flow
              </p>
              <BookingFlowSteps
                currentStatus={booking.status as BookingStatus}
                variant="dark"
              />
            </div>

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
              {booking.productOptionTitle && (
                <InfoRow label="Option" value={booking.productOptionTitle} />
              )}
              {booking.productOptionCode && !booking.productOptionTitle && (
                <InfoRow label="Option Code" value={booking.productOptionCode} mono />
              )}
            </Section>

            {/* Booking Info */}
            <Section title="Booking Info">
              <InfoRow label="Travel Date" value={fmtDate(booking.travelDate)} />
              <InfoRow label="Time" value={booking.travelTime || "Not set yet"} />
              <InfoRow label="Guests" value={`${booking.pax} person(s)`} />
              <InfoRow label="Total Price" value={formatPrice(booking.totalPrice)} highlight />
              {booking.manualPrice && (
                <InfoRow label="Admin Price" value={formatPrice(booking.manualPrice)} highlight />
              )}
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

            {/* ────────────────────────────────────────────────────── */}
            {/* PENDING/PAYMENT: Set price & time, get payment link   */}
            {/* Admin CANNOT change status — it auto-changes on pay   */}
            {/* ────────────────────────────────────────────────────── */}
            {(booking.status === "PAYMENT" || booking.status === "PENDING") && (
              <Section title="Set Price & Payment Link">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
                  <p className="text-[11px] text-amber-300 font-semibold leading-relaxed">
                    Set the price and time below, then copy the payment link to send to the customer via WhatsApp.
                    Status will <strong>automatically change to Confirmed</strong> once the customer completes payment.
                  </p>
                </div>

                {booking.promoCode && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Promo Code:</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-mono rounded border border-indigo-500/20">
                      {booking.promoCode}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Price (IDR)
                    </label>
                    <input
                      type="number"
                      value={manualPriceInput}
                      onChange={(e) => setManualPriceInput(e.target.value)}
                      placeholder="e.g. 1500000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      O'clock (Time)
                    </label>
                    <input
                      type="time"
                      value={manualTimeInput}
                      onChange={(e) => setManualTimeInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSetManualPrice}
                  disabled={savingPrice}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition mb-2"
                >
                  {savingPrice ? "Saving..." : booking.manualPrice ? "Update Price & Time" : "Save Price & Time"}
                </button>

                {booking.manualPrice && (
                  <p className="text-[10px] text-slate-400 text-center mb-3">
                    You can update the price anytime before the customer pays.
                  </p>
                )}

                {booking.manualPrice && booking.bookingRef ? (
                  <button
                    onClick={handleCopyPaymentLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-bold rounded-xl border border-emerald-600/30 transition"
                  >
                    <FaCopy className="w-3.5 h-3.5" />
                    Copy Payment Link for Customer
                  </button>
                ) : (
                  <p className="text-[10px] text-slate-500 text-center">
                    Save the price first to get the payment link.
                  </p>
                )}
              </Section>
            )}

            {/* ────────────────────────────────────────────────────── */}
            {/* CONFIRMED STATUS: User paid → Admin books on Viator   */}
            {/* then uploads ticket image → Mark Completed            */}
            {/* ────────────────────────────────────────────────────── */}
            {booking.status === "CONFIRMED" && (
              <>
                {/* Success alert */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✅</span>
                    <p className="text-[12px] text-emerald-400 font-bold">Customer has paid!</p>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Now book manually on Viator using the customer data below, then upload the ticket image and mark as completed.
                  </p>
                </div>

                {/* Customer Data for Viator Booking */}
                <Section title="Data for Viator Booking">
                  <div className="bg-slate-800/80 rounded-xl p-4 space-y-2 border border-slate-700/50">
                    <InfoRow label="Product Code" value={booking.productCode} mono />
                    <InfoRow label="Travel Date" value={fmtDate(booking.travelDate)} />
                    <InfoRow label="Time" value={booking.travelTime || "—"} />
                    <InfoRow label="Guests" value={`${booking.pax} person(s)`} />
                    {booking.productOptionTitle && (
                      <InfoRow label="Option" value={booking.productOptionTitle} />
                    )}

                    {/* Pax Mix */}
                    {paxMixJson && paxMixJson.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pax Mix</p>
                        {paxMixJson.map((p: any, i: number) => (
                          <p key={i} className="text-xs text-white">
                            {p.numberOfTravelers}x {p.ageBand}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Travelers */}
                    {travelersJson && travelersJson.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Travelers</p>
                        {travelersJson.map((t: any, i: number) => (
                          <p key={i} className="text-xs text-white">
                            {t.firstName} {t.lastName} ({t.ageBand})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                {/* Upload Ticket */}
                <Section title="Upload Ticket Image">
                  <div className="flex items-center gap-4">
                    {booking.ticketImageUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
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
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 flex flex-col items-center justify-center gap-1 transition text-slate-500 hover:text-violet-400 bg-slate-800/50 shrink-0"
                      >
                        <span className="text-xl">📸</span>
                        <span className="text-[10px] font-bold uppercase">Upload</span>
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Upload the Viator ticket/voucher image. Customer will see this in their profile.
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

                  {!booking.ticketImageUrl && (
                    <p className="text-[10px] text-amber-400 mt-2">
                      You must upload the ticket image before marking as completed.
                    </p>
                  )}
                </Section>
              </>
            )}

            {/* Ticket Image Preview (completed) */}
            {booking.status === "COMPLETED" && booking.ticketImageUrl && (
              <Section title="Ticket">
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
                  </div>
                </div>
              </Section>
            )}

            {/* Status Actions (Cancel or Mark Completed) */}
            {transitions.length > 0 && (
              <Section title="Actions">
                <div className="flex flex-wrap gap-2">
                  {transitions.map((t) => (
                    <button
                      key={t.status}
                      onClick={() => onUpdateStatus(booking.id, t.status)}
                      disabled={isActionDisabled(t.status)}
                      className={`px-4 py-2.5 ${t.color} text-white text-sm font-bold rounded-xl transition disabled:opacity-40 shadow-lg shadow-black/20`}
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      <span
        className={`text-sm font-medium text-right truncate ${
          highlight ? "text-violet-400 font-bold" : "text-white"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
