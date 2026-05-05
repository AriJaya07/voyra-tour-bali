import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import type { Booking, BookingStatus } from "@/types/booking";
import BookingFlowSteps from "@/components/Global/booking/BookingFlowSteps";
import PayNowButton from "@/components/Global/booking/PayNowButton";
import { CloseIcon } from "@/components/assets/Icon/shared";

interface TicketModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function TicketModal({ booking, onClose }: TicketModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [sendingEmail, setSendingEmail] = React.useState(false);

  if (!booking) return null;

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-green-500",
    COMPLETED: "bg-blue-600",
    PENDING: "bg-yellow-500",
    PAYMENT: "bg-orange-500",
    CANCELLED: "bg-red-500",
  };

  const statusMessages: Record<string, string> = {
    COMPLETED: "Your ticket is ready!",
    CONFIRMED: "Payment received — booking in progress",
    PENDING: "Booking submitted",
    PAYMENT: "Waiting for your payment",
    CANCELLED: "This booking is cancelled",
  };

  const isCompleted = booking.status === "COMPLETED";
  const isConfirmed = booking.status === "CONFIRMED";
  const isPayment = booking.status === "PAYMENT";
  const qrString = booking.ticketImageUrl || `https://voyratours.com/ticket/${booking.bookingRef}`;
  const travelers = booking.travelers || [];
  const leadTraveler = travelers.length > 0 ? travelers[0].fullName : "Guest";
  const paxSummary = travelers.map((t) => t.ageBand).reduce((acc: Record<string, number>, curr: string) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  const handleDownloadTicket = async () => {
    if (!booking.ticketImageUrl) return;

    try {
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(booking.ticketImageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voyra-ticket-${booking.bookingRef}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      window.open(booking.ticketImageUrl, "_blank");
    }
  };

  const handleViewVoucher = () => {
    if (booking.ticketImageUrl) {
      window.open(booking.ticketImageUrl, "_blank");
    }
  };

  const handleSaveImage = async () => {
    if (ticketRef.current) {
      try {
        const dataUrl = await toPng(ticketRef.current, {
          backgroundColor: "#f3f4f6",
          filter: (node) => {
            if (node.classList && node.classList.contains("print-hide")) {
              return false;
            }
            return true;
          },
        });
        const link = document.createElement("a");
        link.download = `voyra-ticket-capture-${booking.bookingRef}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Failed to save ticket image", err);
        toast.error("Could not save ticket image.");
      }
    }
  };

  const handleResendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/resend-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: booking.bookingRef }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Ticket sent to ${data.email}`);
      } else {
        toast.error("Failed to send email. Please try again.");
      }
    } catch (err) {
      toast.error("Error sending email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          ref={ticketRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-100 w-full max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col relative ticket-print-container"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 transition shadow-sm print:hidden"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          {/* Print Styles Injection */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden; }
              .ticket-print-container, .ticket-print-container * { visibility: visible; }
              .ticket-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: none;
                max-height: none;
                box-shadow: none;
                background: white;
                overflow: visible;
              }
              .print-hide { display: none !important; }
            }
          `}} />

          {/* Header */}
          <div className="bg-white p-6 text-center border-b-2 border-dashed border-gray-200 shrink-0">
            <h1 className="text-2xl font-black tracking-tight text-[#0071CE] uppercase">Voyra</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              {isCompleted ? "Official Booking Ticket" : "Booking Details"}
            </p>
          </div>

          {/* Status Banner */}
          <div className={`p-3 text-center text-white font-bold text-sm ${statusColors[booking.status] || "bg-gray-500"} print-hide`}>
            {isCompleted ? "🎉 " : isConfirmed ? "✅ " : booking.status === "CANCELLED" ? "❌ " : isPayment ? "💳 " : "📝 "}
            {statusMessages[booking.status] || booking.status}
          </div>

          {/* Flow Steps */}
          <div className="px-6 pt-4 print-hide">
            <BookingFlowSteps
              currentStatus={booking.status as BookingStatus}
              variant="light"
            />
          </div>

          <div className="p-6 bg-white space-y-6 shrink-0 grow">
            {/* Main Content Section */}
            <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-2xl border border-gray-100 print:bg-white print:border-none">
              {isCompleted ? (
                <>
                  {booking.ticketImageUrl ? (
                    <div className="w-full space-y-4">
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <img
                          src={booking.ticketImageUrl}
                          alt="Official Ticket"
                          className="w-full h-auto object-contain cursor-pointer"
                          onClick={handleViewVoucher}
                        />
                      </div>
                      <div className="text-center py-2 px-4 bg-white rounded-xl border border-gray-100 italic text-gray-500 text-[10px]">
                        Scan the QR/Bar code on the ticket above to verify with your guide
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-3 rounded-xl shadow-sm mb-4 print:shadow-none">
                        <QRCodeSVG
                          value={qrString}
                          size={200}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-widest">Digital Verification</p>
                        <p className="text-2xl font-black text-gray-900 tracking-wider">
                          {booking.bookingRef}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2">Scan to verify this booking</p>
                      </div>
                    </>
                  )}
                </>
              ) : isConfirmed ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <p className="text-gray-900 font-bold">Payment Received</p>
                  <p className="text-sm text-gray-500 mt-2">
                    We are processing your booking with the supplier. Your ticket will appear here once ready.
                  </p>
                </div>
              ) : isPayment || (booking.status === "PENDING" && booking.snapToken) ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-gray-900 font-bold text-lg mb-4">Payment Required</p>
                  <PayNowButton booking={booking} className="inline-flex px-8 py-3.5 text-base rounded-xl shadow-lg shadow-blue-200" />
                  {!booking.manualPrice && !booking.snapToken && (
                    <p className="text-sm text-gray-500 mt-4">
                      Our team is preparing your booking. You will be notified via WhatsApp once it's ready.
                    </p>
                  )}
                </div>
              ) : booking.status === "CANCELLED" ? (
                <div className="text-center py-8 opacity-50 relative print:opacity-100">
                  <div className="text-5xl mb-4">❌</div>
                  <p className="text-gray-900 font-bold">Booking Cancelled</p>
                  <p className="text-sm text-gray-500 mt-2">This ticket is no longer valid</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">📝</div>
                  <p className="text-gray-900 font-bold">Booking Submitted</p>
                  <p className="text-sm text-gray-500 mt-2">Our team is preparing your booking.</p>
                </div>
              )}
            </div>

            {/* Tour Details */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tour Details</h3>
              <div className="space-y-3">
                <p className="font-bold text-lg text-gray-900 leading-tight">
                  {booking.productTitle}
                </p>
                {booking.productOptionTitle && (
                  <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {booking.productOptionTitle}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-xl print:border print:border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
                    <p className="font-bold text-gray-900">{format(new Date(booking.travelDate), "dd MMM yyyy")}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl print:border print:border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Time</p>
                    <p className="font-bold text-gray-900">{booking.travelTime || "Pending Confirmation"}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl text-sm print:border print:border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Meeting Point</p>
                  <p className="font-bold text-gray-900">{booking.meetingPoint || "Hotel Lobby / Specified Pickup Location"}</p>
                </div>
                {booking.languageGuide && (
                  <div className="bg-gray-50 p-3 rounded-xl text-sm print:border print:border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Language</p>
                    <p className="font-bold text-gray-900">
                      {booking.languageGuide.charAt(0).toUpperCase() + booking.languageGuide.slice(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-dashed border-gray-200" />

            {/* Traveler Details */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Traveler Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:border print:border-gray-200">
                  <span className="text-gray-500 font-medium text-xs">Lead Traveler</span>
                  <span className="font-bold text-gray-900">{leadTraveler}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:border print:border-gray-200">
                  <span className="text-gray-500 font-medium text-xs">Total Guests ({booking.pax})</span>
                  <span className="font-bold text-gray-900">
                    {Object.entries(paxSummary).map(([band, count]) => `${count} ${band}`).join(", ")}
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-dashed border-gray-200" />

            {/* Cancellation Policy */}
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 print:bg-white print:border-gray-300">
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 print:text-gray-600">Cancellation Policy</h3>
              <p className="text-xs text-orange-700 print:text-gray-700">
                Cancel at least 24 hours in advance to receive a full refund. Standard Viator cancellation rules apply.
              </p>
            </div>
          </div>

          {/* Footer & Actions */}
          <div className="bg-gray-900 p-6 flex-shrink-0 print-hide">
            {isCompleted ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition flex items-center justify-center gap-2"
                >
                  🖨️ Print
                </button>
                {booking.ticketImageUrl ? (
                  <button
                    onClick={handleDownloadTicket}
                    className="py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    ⬇️ Download
                  </button>
                ) : (
                  <button
                    onClick={handleSaveImage}
                    className="py-3 px-4 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition flex items-center justify-center gap-2"
                  >
                    📱 Save
                  </button>
                )}
                <button
                  onClick={handleResendEmail}
                  disabled={sendingEmail}
                  className="col-span-2 py-3 px-4 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  ✉️ {sendingEmail ? "Sending..." : "Resend to Email"}
                </button>
              </div>
            ) : isConfirmed ? (
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-400">
                  Your booking is being processed. Your ticket will appear here once ready.
                </p>
              </div>
            ) : isPayment ? (
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-400">
                  {booking.manualPrice
                    ? "Complete your payment above. Your ticket will appear here after we process your booking."
                    : "Our team will set your price soon. You'll be notified via WhatsApp."}
                </p>
              </div>
            ) : null}

            <div className="text-center opacity-60">
              <p className="text-[10px] text-gray-400 font-medium">Powered by Viator / Tripadvisor</p>
              <a href="https://wa.me/your_number" target="_blank" rel="noreferrer" className="text-[10px] text-green-400 font-bold mt-1 inline-block hover:underline">
                WhatsApp Support
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
