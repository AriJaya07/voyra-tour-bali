"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CancelButtonClient({ bookingRef, token }: { bookingRef: string, token: string }) {
  const router = useRouter();
  const [isQuoting, setIsQuoting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const handleGetQuote = async () => {
    try {
      setIsQuoting(true);
      const res = await fetch(`/api/viator/cancel-quote?bookingRef=${bookingRef}`);
      const data = await res.json();
      if (res.ok && data.refundDetails) {
        setQuote(data);
      } else {
        toast.error("Could not get cancellation quote.");
  }
    } catch (e) {
      toast.error("Error fetching cancellation quote.");
    } finally {
      setIsQuoting(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      const res = await fetch('/api/viator/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, reasonCode: "CUSTOMER_REQUEST" })
      });
      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("Booking cancelled successfully.");
        // We would also update the db status here, but for now just refresh
        router.refresh();
      } else {
        toast.error("Failed to cancel booking.");
      }
    } catch (e) {
      toast.error("Error cancelling booking. Please try again.");
    } finally {
      setIsCancelling(false);
      setQuote(null);
    }
  };

  if (!bookingRef) return null;

  return (
    <div className="mt-4">
      {quote ? (
        <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
          <h3 className="font-bold text-red-700 mb-2">Cancel Booking?</h3>
          <p className="text-sm text-red-600 mb-4">
            If you cancel now, your refund will be <strong>{quote.refundDetails.refundAmount} {quote.refundDetails.currencyCode}</strong>.
            <br/>Status: {quote.status}
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => setQuote(null)} 
              disabled={isCancelling}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
            >
              Keep Booking
            </button>
            <button 
              onClick={handleCancel} 
              disabled={isCancelling}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={handleGetQuote}
          disabled={isQuoting}
          className="w-full text-center py-3 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition"
        >
          {isQuoting ? "Checking Policy..." : "Request Cancellation"}
        </button>
      )}
    </div>
  );
}
