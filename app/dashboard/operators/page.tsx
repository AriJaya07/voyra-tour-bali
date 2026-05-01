"use client";

import { useEffect, useState } from "react";

interface Operator {
  id: number;
  name: string;
  slug: string;
  email: string;
  whatsapp: string | null;
  licenseNo: string;
  insurance: boolean;
  yearsActive: number;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  rejectReason: string | null;
  createdAt: string;
  ownerUser: { email: string; name: string | null };
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const BADGE: Record<Operator["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  SUSPENDED: "bg-gray-100 text-gray-600 border-gray-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminOperatorsPage() {
  const [list, setList] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/admin/operators", { cache: "no-store" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: number, status: string, rejectReason?: string) => {
    await fetch(`/api/admin/operators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectReason }),
    });
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Operators</h1>
        <p className="text-sm text-gray-500 mb-6">Approve, suspend, or reject operator applications.</p>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            No operator applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((op) => (
              <div
                key={op.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${BADGE[op.status]}`}
                    >
                      {op.status}
                    </span>
                    <p className="text-xs text-gray-400">Applied {fmt(op.createdAt)}</p>
                  </div>
                  <h3 className="font-bold text-gray-900">{op.name}</h3>
                  <p className="text-xs text-gray-500 break-all mt-0.5">
                    {op.ownerUser.email} · {op.email} · License: {op.licenseNo}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {op.yearsActive} yrs active · Insurance: {op.insurance ? "✓" : "✕"} ·{" "}
                    {op.whatsapp || "no WA"}
                  </p>
                  {op.rejectReason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {op.rejectReason}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2 shrink-0">
                  {op.status !== "APPROVED" && (
                    <button
                      onClick={() => setStatus(op.id, "APPROVED")}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      Approve
                    </button>
                  )}
                  {op.status !== "REJECTED" && (
                    <button
                      onClick={() => {
                        const reason = prompt("Reject reason?") || "";
                        if (reason !== null) setStatus(op.id, "REJECTED", reason);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100"
                    >
                      Reject
                    </button>
                  )}
                  {op.status === "APPROVED" && (
                    <button
                      onClick={() => setStatus(op.id, "SUSPENDED")}
                      className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
