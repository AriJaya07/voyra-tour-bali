"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import { StarSolidIcon } from "@/components/assets/Icon/shared";

interface MyReview {
  id: number;
  productCode: string;
  source: string;
  rating: number;
  title: string | null;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  bookingId: number | null;
  createdAt: string;
  booking?: { productTitle: string; productImage: string | null; travelDate: string } | null;
}

interface PendingBooking {
  id: number;
  productCode: string;
  productTitle: string;
  productImage: string | null;
  travelDate: string;
}

export default function MyReviewsPage() {
  const { status } = useSession();
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [toReview, setToReview] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBooking, setOpenBooking] = useState<PendingBooking | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/reviews?mine=1", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);
      const reviews: MyReview[] = r1.ok ? await r1.json() : [];
      const bookings = r2.ok ? await r2.json() : [];
      const reviewedBookingIds = new Set(reviews.map((r) => r.bookingId).filter(Boolean) as number[]);
      const pending = (bookings as PendingBooking[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((b: any) => b.status === "COMPLETED" && !reviewedBookingIds.has(b.id))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((b: any) => ({
          id: b.id,
          productCode: b.productCode,
          productTitle: b.productTitle,
          productImage: b.productImage,
          travelDate: b.travelDate,
        }));
      setMyReviews(reviews);
      setToReview(pending);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <Link href="/login" className="px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-row items-center gap-4 mb-6 flex-wrap">
          <BackLink href="/profile" label="Back to profile" />
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : (
          <>
            {toReview.length > 0 && (
              <section className="mb-8">
                <h2 className="font-bold text-lg mb-3">Reviews to write ({toReview.length})</h2>
                <div className="space-y-3">
                  {toReview.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {b.productImage && <img src={b.productImage} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{b.productTitle}</p>
                        <p className="text-xs text-gray-500">Trip date: {new Date(b.travelDate).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setOpenBooking(b)}
                        className="px-4 py-2 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-xl shrink-0"
                      >
                        Write Review
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-bold text-lg mb-3">My past reviews ({myReviews.length})</h2>
              {myReviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm">You haven&apos;t written any reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myReviews.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{r.booking?.productTitle ?? r.productCode}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <Stars value={r.rating} />
                      {r.title && <p className="font-bold mt-2">{r.title}</p>}
                      <p className="text-sm text-gray-700 mt-1">{r.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {openBooking && (
        <ReviewModal
          booking={openBooking}
          onClose={() => setOpenBooking(null)}
          onSuccess={() => {
            setOpenBooking(null);
            toast.success("Review submitted! Awaiting moderation.");
            load();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const map = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${map[status]}`}>{status}</span>;
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star`}
        >
          <StarSolidIcon className={`w-5 h-5 ${n <= value ? "fill-amber-400" : "fill-gray-200"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: PendingBooking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim() || text.trim().length < 20) {
      toast.error("Please write at least 20 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          productCode: booking.productCode,
          source: "local",
          rating,
          title,
          body: text,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-xl mb-1">{booking.productTitle}</h2>
        <p className="text-xs text-gray-500 mb-4">Trip: {new Date(booking.travelDate).toLocaleDateString()}</p>

        <label className="block text-sm font-semibold text-gray-700 mb-2">Your rating</label>
        <Stars value={rating} onChange={setRating} />

        <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1.5">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sum it up in a few words"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
        />

        <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1.5">Your review</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Share what you loved, what could improve, and tips for future travelers."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
        />
        <p className="text-xs text-gray-400 mt-1">{text.length}/2000</p>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 rounded-xl"
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
