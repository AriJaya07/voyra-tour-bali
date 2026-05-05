"use client";

import { useState, useRef } from "react";
import { Booking, bookingService } from "@/utils/service/booking.service";
import { ADMIN_ALLOWED_TRANSITIONS, BOOKING_STATUS_MAP, BOOKING_STATUS_DARK } from "@/types/booking";
import type { BookingStatus } from "@/types/booking";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingFlowSteps from "./BookingFlowSteps";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import { toast } from "sonner";
import {
  CloseIcon,
  InfoIcon,
  AlertIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  CheckmarkIcon,
  ImageIcon,
} from "@/components/assets/Icon/shared";

// Context notes per current status — shown in the select step
const STATUS_CONTEXT_NOTE: Partial<Record<BookingStatus, { type: "info" | "warning"; text: string }>> = {
  PENDING: {
    type: "info",
    text: "Normal next step: open the booking details, set the price & travel time, then save — status will automatically advance to Payment and you can copy the payment link for the customer.",
  },
  PAYMENT: {
    type: "info",
    text: "If the customer paid via m-banking or manual transfer, use \"Confirm Payment\" to advance to Confirmed. Upload the payment screenshot as proof.",
  },
};

// Why a given status is not reachable from current
function getBlockedReason(from: BookingStatus, to: BookingStatus): string {
  if (to === from) return "Already in this status.";
  if (to === "CANCELLED" && (from === "COMPLETED" || from === "CANCELLED")) {
    return from === "CANCELLED" ? "Already cancelled." : "Completed bookings cannot be cancelled.";
  }
  if (to === "CONFIRMED" && from !== "PAYMENT" && from !== "PENDING") {
    return "CONFIRMED is set automatically when customer pays via gateway.";
  }
  if (to === "PAYMENT" && from !== "PENDING") {
    return from === "CANCELLED" ? "Cannot reopen a cancelled booking." : "Already past this stage.";
  }
  if (to === "PENDING") return "Cannot move back to Pending.";
  if (to === "COMPLETED" && from !== "CONFIRMED") {
    return from === "CANCELLED" ? "Cannot complete a cancelled booking." : "Must be Confirmed before completing.";
  }
  return "Transition not allowed.";
}

interface BookingStatusChangeModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  updatingStatus: boolean;
}

const ALL_STATUSES: BookingStatus[] = ["PENDING", "PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"];

type Step = "select" | "confirm";

export default function BookingStatusChangeModal({
  booking,
  onClose,
  onUpdateStatus,
  updatingStatus,
}: BookingStatusChangeModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [targetStatus, setTargetStatus] = useState<BookingStatus | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(
    // pre-fill if ticket already uploaded
    booking.ticketImageUrl ?? null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const available = (ADMIN_ALLOWED_TRANSITIONS[booking.status] || []).map((t) => t.status as BookingStatus);
  const contextNote = STATUS_CONTEXT_NOTE[booking.status as BookingStatus];
  const needsProof   = targetStatus === "CONFIRMED";
  const needsTicket  = targetStatus === "COMPLETED";
  const uploadedUrl  = needsProof ? proofUrl : needsTicket ? ticketUrl : null;
  const needsUpload  = needsProof || needsTicket;

  function handleSelect(status: BookingStatus) {
    setTargetStatus(status);
    setProofUrl(null);
    setStep("confirm");
  }

  function handleConfirm() {
    if (!targetStatus) return;
    if (needsUpload && !uploadedUrl) {
      toast.error(needsProof ? "Upload payment proof first." : "Upload ticket image first.");
      return;
    }
    onUpdateStatus(booking.id, targetStatus);
    onClose();
  }

  function handleBack() {
    setTargetStatus(null);
    setProofUrl(null);
    setStep("select");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (needsProof) {
        const res = await bookingService.uploadPaymentProof(booking.id, file);
        if (res.success) { setProofUrl(res.paymentProofUrl); toast.success("Payment proof uploaded!"); }
      } else if (needsTicket) {
        const res = await bookingService.uploadTicket(booking.id, file);
        if (res.success) { setTicketUrl(res.ticketImageUrl); toast.success("Ticket image uploaded!"); }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const targetConfig = targetStatus ? BOOKING_STATUS_MAP[targetStatus] : null;
  const currentConfig = BOOKING_STATUS_MAP[booking.status];

  return (
    <DashboardModal open onClose={onClose} maxWidth="max-w-md">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-base">Change Booking Status</h2>
            <p className="text-slate-500 text-xs font-mono mt-0.5">
              {booking.bookingRef || `ID: ${booking.id}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BookingStatusBadge status={booking.status} variant="dark" size="sm" showIcon />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ── SELECT STEP ── */}
          {step === "select" && (
            <>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Current Flow
                </p>
                <BookingFlowSteps currentStatus={booking.status as BookingStatus} variant="dark" />
              </div>

              {contextNote && (
                <div className={`flex gap-2.5 p-3 rounded-xl ${
                  contextNote.type === "info"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}>
                  <InfoIcon className={`w-4 h-4 shrink-0 mt-0.5 ${contextNote.type === "info" ? "text-blue-400" : "text-amber-400"}`} />
                  <p className={`text-[11px] leading-relaxed ${contextNote.type === "info" ? "text-blue-300" : "text-amber-300"}`}>
                    {contextNote.text}
                  </p>
                </div>
              )}

              <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  Manual status changes override automatic flow. Only change if there is a specific reason.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Change to</p>
                <div className="space-y-2">
                  {ALL_STATUSES.filter((s) => s !== booking.status).map((status) => {
                    const isAvailable = available.includes(status);
                    const config = BOOKING_STATUS_MAP[status];
                    const darkStyle = BOOKING_STATUS_DARK[status];
                    const blockedReason = !isAvailable ? getBlockedReason(booking.status as BookingStatus, status) : null;

                    return (
                      <button
                        key={status}
                        onClick={() => isAvailable && handleSelect(status)}
                        disabled={!isAvailable}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition text-left ${
                          isAvailable
                            ? "border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 cursor-pointer"
                            : "border-slate-800/60 opacity-40 cursor-not-allowed bg-slate-800/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${darkStyle}`}>
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                          <span className="text-slate-400 text-xs truncate">
                            {isAvailable ? config.description : blockedReason}
                          </span>
                        </div>
                        {isAvailable && (
                          <ChevronRightIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── CONFIRM STEP ── */}
          {step === "confirm" && targetStatus && targetConfig && (
            <>
              {/* FROM → TO */}
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="flex flex-col items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${BOOKING_STATUS_DARK[booking.status]}`}>
                    <span>{currentConfig.icon}</span>
                    {currentConfig.label}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">From</span>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="flex flex-col items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${BOOKING_STATUS_DARK[targetStatus]}`}>
                    <span>{targetConfig.icon}</span>
                    {targetConfig.label}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">To</span>
                </div>
              </div>

              {/* Upload section — payment proof (CONFIRMED) or ticket (COMPLETED) */}
              {needsUpload && (
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white mb-0.5">
                      {needsProof ? "Upload Payment Proof" : "Upload Ticket Image"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {needsProof
                        ? "Upload the customer's payment screenshot (m-banking / transfer receipt). Required before confirming."
                        : "Upload the Viator ticket / voucher image. Customer will see this in their profile. Required before completing."}
                    </p>
                  </div>

                  {uploadedUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-slate-600 bg-slate-800 group">
                        <img
                          src={uploadedUrl}
                          alt={needsProof ? "Payment proof" : "Ticket image"}
                          className="w-full max-h-48 object-contain"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs text-white font-bold"
                        >
                          Change Image
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <CheckmarkIcon className="w-3.5 h-3.5" />
                        {needsProof ? "Proof uploaded — ready to confirm" : "Ticket uploaded — ready to complete"}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-600 hover:border-violet-500 hover:bg-violet-500/5 transition text-slate-400 hover:text-violet-400 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold uppercase tracking-widest">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-7 h-7" />
                          <span className="text-xs font-semibold">
                            {needsProof ? "Click to upload screenshot" : "Click to upload ticket image"}
                          </span>
                          <span className="text-[10px] text-slate-500">JPEG, PNG, WEBP · max 5MB</span>
                        </>
                      )}
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {/* Summary box */}
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
                <p className="text-white text-sm font-semibold">Confirm this change?</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Booking <span className="font-mono text-slate-300">{booking.bookingRef || `#${booking.id}`}</span> will be manually changed from{" "}
                  <span className="font-semibold text-white">{currentConfig.label}</span> to{" "}
                  <span className="font-semibold text-white">{targetConfig.label}</span>.
                </p>
                {targetStatus === "CANCELLED" && (
                  <p className="text-red-400 text-xs font-semibold">
                    This will cancel the booking. This action is hard to undo.
                  </p>
                )}
                {targetStatus === "COMPLETED" && (
                  <p className="text-emerald-400 text-xs">
                    Ensure ticket image is already uploaded before marking as completed.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {step === "confirm" ? (
            <>
              <button
                onClick={handleBack}
                disabled={updatingStatus || uploading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={updatingStatus || uploading || (needsProof && !proofUrl)}
                title={needsProof && !proofUrl ? "Upload payment proof first" : undefined}
                className={`px-5 py-2 text-white text-sm font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  targetStatus === "CANCELLED"
                    ? "bg-red-600 hover:bg-red-500"
                    : targetStatus === "COMPLETED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {updatingStatus ? "Updating..." : "Confirm Change"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </DashboardModal>
  );
}
