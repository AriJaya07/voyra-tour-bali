"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/Dashboard/ThemeProvider";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

interface AdminReview {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  productCode: string;
  source: string;
  user: { id: number; name: string | null; email: string; image: string | null };
  booking: { productTitle: string; productImage: string | null; travelDate: string; bookingRef: string } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminReviewsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("PENDING");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setReviews(await res.json());
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (sessionStatus === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    if (sessionStatus === "authenticated") load();
  }, [sessionStatus, session, router, load]);

  const moderate = async (id: number, status: ReviewStatus) => {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Review ${status.toLowerCase()}`);
      setReviews((rs) => rs.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to update review");
    } finally {
      setActingId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Permanently delete this review?")) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      setReviews((rs) => rs.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setActingId(null);
    }
  };

  const cardCls = isDark ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`p-6 min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-5xl mx-auto">
        <h1 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Reviews Moderation</h1>
        <p className={`text-sm mb-6 ${textMuted}`}>Approve or reject pending reviews from verified bookers.</p>

        <div className="flex gap-2 mb-6">
          {(["PENDING", "APPROVED", "REJECTED"] as ReviewStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                statusFilter === s
                  ? "bg-[#0071CE] text-white"
                  : isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : reviews.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-12 text-center ${isDark ? "border-gray-800" : "border-gray-300"}`}>
            <p className={`font-bold mb-1 ${textPrimary}`}>No {statusFilter.toLowerCase()} reviews</p>
            <p className={`text-sm ${textMuted}`}>Nothing to moderate right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className={`rounded-2xl border p-5 ${cardCls}`}>
                <div className="flex items-start gap-4 mb-3">
                  <img
                    src={r.user.image || "/images/people.png"}
                    alt={r.user.name || ""}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${textPrimary}`}>{r.user.name || "Anonymous"}</p>
                    <p className={`text-xs ${textMuted}`}>{r.user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Stars value={r.rating} />
                    <p className={`text-xs mt-1 ${textMuted}`}>{fmtDate(r.createdAt)}</p>
                  </div>
                </div>

                <div className={`mb-3 p-3 rounded-xl ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
                  <p className={`text-xs font-semibold ${textMuted}`}>Tour</p>
                  <p className={`text-sm font-bold ${textPrimary}`}>
                    {r.booking?.productTitle ?? r.productCode} <span className={`font-normal ${textMuted}`}>· {r.source}</span>
                  </p>
                  {r.booking && (
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      Booking {r.booking.bookingRef} · trip {fmtDate(r.booking.travelDate)}
                    </p>
                  )}
                </div>

                {r.title && <p className={`font-bold mb-1 ${textPrimary}`}>{r.title}</p>}
                <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>{r.body}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {r.status !== "APPROVED" && (
                    <button
                      onClick={() => moderate(r.id, "APPROVED")}
                      disabled={actingId === r.id}
                      className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== "REJECTED" && (
                    <button
                      onClick={() => moderate(r.id, "REJECTED")}
                      disabled={actingId === r.id}
                      className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-60"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    disabled={actingId === r.id}
                    className="px-4 py-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 justify-end">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={`w-4 h-4 ${n <= value ? "fill-amber-400" : "fill-gray-600/40"}`}>
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
}
