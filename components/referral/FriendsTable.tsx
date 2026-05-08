"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ReferralRow {
  id: number;
  inviteeEmail: string;
  code: string;
  status: "PENDING" | "SIGNED_UP" | "ACTIVE" | "DECLINED" | "CONVERTED";
  bookingsCount: number;
  totalRewarded: number;
  rewardGiven: boolean;
  createdAt: string;
}

interface FriendsTableProps {
  referrals: ReferralRow[];
  onChange: () => void;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function FriendsTable({ referrals, onChange }: FriendsTableProps) {
  const [busyId, setBusyId] = useState<number | null>(null);

  if (!referrals.length) {
    return (
      <div className="text-center py-6 text-sm text-gray-500">
        No friends invited yet. Use the share buttons above.
      </div>
    );
  }

  const resend = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) toast.success("Invite resent");
      else toast.error(data?.error || "Could not resend");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: number) => {
    if (!confirm("Cancel this pending invite?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Invite cancelled");
        onChange();
      } else {
        toast.error(data?.error || "Could not cancel");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className="divide-y divide-gray-100">
      {referrals.map((r) => (
        <li key={r.id} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 text-sm truncate">{r.inviteeEmail}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              <span className="font-mono">{r.code}</span> · {fmtDate(r.createdAt)}
              {r.bookingsCount > 0 ? ` · ${r.bookingsCount} booking${r.bookingsCount > 1 ? "s" : ""}` : ""}
              {r.totalRewarded > 0 ? ` · +${r.totalRewarded}cr` : ""}
            </p>
          </div>
          <StatusPill status={r.status} bookings={r.bookingsCount} />
          <div className="flex gap-1.5">
            {r.status === "PENDING" ? (
              <>
                <button
                  onClick={() => resend(r.id)}
                  disabled={busyId === r.id}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#0071CE] hover:bg-blue-50 rounded transition disabled:opacity-50"
                >
                  Resend
                </button>
                <button
                  onClick={() => cancel(r.id)}
                  disabled={busyId === r.id}
                  className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : null}
            {r.status === "SIGNED_UP" ? (
              <span className="px-2.5 py-1 text-[11px] text-gray-400 italic">awaiting booking</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ status, bookings }: { status: ReferralRow["status"]; bookings: number }) {
  const isBooked = status === "ACTIVE" && bookings > 0;
  const cls = isBooked
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "SIGNED_UP" || status === "ACTIVE"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : status === "DECLINED"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-100 text-gray-600 border-gray-200";
  const label = isBooked
    ? `Booked ✓`
    : status === "SIGNED_UP"
      ? "Signed up"
      : status === "ACTIVE"
        ? "Active"
        : status === "DECLINED"
          ? "Declined"
          : "Pending";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}
