"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Itinerary {
  id: number;
  title: string;
  fromDate: string | null;
  toDate: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  shareSlug: string | null;
  createdAt: string;
}

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export default function ItinerariesListPage() {
  const { status } = useSession();
  const [items, setItems] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/itineraries", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const remove = async (id: number) => {
    if (!confirm("Delete this itinerary?")) return;
    await fetch(`/api/itineraries?id=${id}`, { method: "DELETE" });
    setItems((s) => s.filter((x) => x.id !== id));
  };

  const copyShare = async (slug: string) => {
    const url = `${window.location.origin}/share/itinerary/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`Copied:\n${url}`);
    } catch {
      prompt("Copy link:", url);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to Profile
          </Link>
        </div>
        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Itineraries</h1>
            <p className="text-sm text-gray-500 mt-1">Saved AI plans, ready to revisit or share.</p>
          </div>
          <Link
            href="/plan"
            className="shrink-0 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-lg transition shadow-sm"
          >
            + New Plan
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-900 font-bold text-lg mb-1">No itineraries yet</p>
            <p className="text-sm text-gray-500 mb-6">Build your first AI Bali plan in 30 seconds.</p>
            <Link
              href="/plan"
              className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
            >
              ✨ Plan a trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        it.visibility === "PUBLIC"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {it.visibility === "PUBLIC" ? "🌍 Public" : "🔒 Private"}
                    </span>
                    <p className="text-[11px] text-gray-400">
                      Created {fmt(it.createdAt)}
                    </p>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base leading-snug">{it.title}</h3>
                  {(it.fromDate || it.toDate) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      📅 {fmt(it.fromDate)} → {fmt(it.toDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {it.shareSlug && (
                    <button
                      onClick={() => copyShare(it.shareSlug!)}
                      className="px-3 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-100"
                    >
                      Copy link
                    </button>
                  )}
                  {it.shareSlug && (
                    <Link
                      href={`/share/itinerary/${it.shareSlug}`}
                      className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => remove(it.id)}
                    className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    ✕
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
