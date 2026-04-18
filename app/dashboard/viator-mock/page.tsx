"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PlusIcon, TrashIcon, ExternalLinkIcon, CopyIcon } from "@/components/assets/Icon/shared";
import { formatPrice, CurrencyCode } from "@/utils/formatPrice";

interface MockBooking {
  id: number;
  slug: string;
  productCode: string;
  productTitle: string;
  productImage: string | null;
  price: number | null;
  currency: string;
  username: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  bookings: MockBooking[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  deletedCount: number;
}

const PAGE_LIMIT = 20;

export default function ViatorMockAdminPage() {
  const [bookings, setBookings] = useState<MockBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/mock-bookings?page=${targetPage}&limit=${PAGE_LIMIT}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PaginatedResponse = await res.json();

      setBookings(data.bookings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);

      if (data.deletedCount > 0) {
        toast.info(`${data.deletedCount} expired record${data.deletedCount > 1 ? "s" : ""} auto-cleaned`);
      }
    } catch (error) {
      toast.error("Failed to load mock bookings");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this mock booking link?")) return;
    try {
      const res = await fetch(`/api/admin/mock-bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Mock booking deleted");
      // Refresh current page (if last item on page, go back one)
      const newTotal = total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_LIMIT));
      const targetPage = page > newTotalPages ? newTotalPages : page;
      fetchBookings(targetPage);
    } catch (error) {
      toast.error("Failed to delete mock booking");
      console.error(error);
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/v/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    fetchBookings(p);
  };

  // Build page numbers to display (max 5 around current)
  const pageNumbers = () => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mock Bookings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage custom marketing links for Viator products.
            {total > 0 && (
              <span className="ml-2 text-slate-500">
                {total} total · auto-cleaned after 24 hours
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/viator-mock/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white dash-keep-white font-semibold rounded-xl text-sm shadow-lg hover:shadow-teal-500/25 transition-all"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Create New Link
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Tours</th>
                <th className="p-4 font-semibold">Slug (Path)</th>
                <th className="p-4 font-semibold">Username</th>
                <th className="p-4 font-semibold">Price</th>
                <th className="p-4 font-semibold">Created</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading mock bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                    No mock booking links found. Create one.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {booking.productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={booking.productImage}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                            <span className="text-slate-500 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-200 line-clamp-1 max-w-[250px]">
                            {booking.productTitle}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Code: {booking.productCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded-md border border-slate-700">
                        /v/{booking.slug}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-400">
                        {booking.username || "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-slate-300">
                        {booking.price
                          ? formatPrice(booking.price, booking.currency as CurrencyCode, "IDR")
                          : "—"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {format(new Date(booking.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyLink(booking.slug)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition"
                          title="Copy Link"
                        >
                          <CopyIcon className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/v/${booking.slug}`}
                          target="_blank"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-teal-400 hover:bg-slate-700 transition"
                          title="Open Link"
                        >
                          <ExternalLinkIcon className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1 || isLoading}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>

              {pageNumbers().map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-slate-600 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    disabled={isLoading}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                      p === page
                        ? "bg-indigo-600 text-white dash-keep-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages || isLoading}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
