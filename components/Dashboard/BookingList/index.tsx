"use client";

import { useState } from "react";
import { useBookings } from "@/utils/hooks/useBookings";
import { Booking } from "@/utils/service/booking.service";
import { formatPrice } from "@/utils/formatPrice";
import BookingTable from "./BookingTable";
import BookingViewModal from "./BookingViewModal";

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending", color: "amber" },
  { key: "CONFIRMED", label: "Confirmed", color: "blue" },
  { key: "COMPLETED", label: "Completed", color: "green" },
  { key: "CANCELLED", label: "Cancelled", color: "gray" },
];

export default function BookingList() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const {
    bookings,
    total,
    totalPages,
    isLoading,
    isError,
    updateStatus,
    updatingStatus,
  } = useBookings({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search.trim() || undefined,
    page,
    limit: 15,
  });

  // Stats
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const revenue = bookings
    .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
          Management
        </p>
        <h1
          className="text-3xl font-black text-white tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Bookings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          View and manage all customer bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={total} icon="📋" />
        <StatCard label="Pending" value={pendingCount} icon="⏳" />
        <StatCard label="Confirmed" value={confirmedCount} icon="✅" />
        <StatCard
          label="Revenue"
          value={formatPrice(revenue)}
          icon="💰"
          isString
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === tab.key
                  ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search ref, product, customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="bg-red-950/50 border border-red-800/50 text-red-400 rounded-2xl px-5 py-4 text-sm">
          Failed to load bookings. Please try refreshing.
        </div>
      )}

      {/* Table */}
      <BookingTable
        bookings={bookings}
        isLoading={isLoading}
        onView={setViewBooking}
        onUpdateStatus={(id, status) => updateStatus({ id, status })}
        updatingStatus={updatingStatus}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({total} bookings)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 disabled:opacity-40 hover:border-slate-500 transition"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 disabled:opacity-40 hover:border-slate-500 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewBooking && (
        <BookingViewModal
          booking={viewBooking}
          onClose={() => setViewBooking(null)}
          onUpdateStatus={(id, status) => {
            updateStatus(
              { id, status },
              { onSuccess: () => setViewBooking(null) }
            );
          }}
          updatingStatus={updatingStatus}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isString,
}: {
  label: string;
  value: number | string;
  icon: string;
  isString?: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-lg font-black text-white">
            {isString ? value : value}
          </p>
        </div>
      </div>
    </div>
  );
}
