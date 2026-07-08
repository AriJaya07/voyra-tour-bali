"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";

interface Note {
  id: number;
  targetType: string;
  targetKey: string;
  targetTitle: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

const TYPE_LABEL: Record<string, string> = {
  tour: "Tour",
  destination: "Destination",
  place: "Place",
};

const TYPE_HREF = (t: string, key: string) => {
  if (t === "tour") return `/detail/${key}`;
  if (t === "destination") return `/destination/${key}`;
  return `/notes/${t}/${key}`;
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "tour", label: "Tours" },
  { key: "destination", label: "Destinations" },
  { key: "place", label: "Places" },
];

const fmt = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export default function NotesIndexPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      const off = reset ? 0 : offset;
      const qs = new URLSearchParams({ limit: "20", offset: String(off) });
      if (filter) qs.set("targetType", filter);
      const res = await fetch(`/api/notes/feed?${qs}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(reset ? data.items : [...items, ...data.items]);
        setHasMore(data.hasMore);
        setOffset(off + data.items.length);
      }
      setLoading(false);
    },
    [filter, offset, items]
  );

  useEffect(() => {
    setOffset(0);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <span className="inline-block bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            Community
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bali notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Honest, recent reports from travelers — what to expect, what to skip.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                filter === f.key
                  ? "bg-[#0071CE] text-white border-[#0071CE]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-900 font-bold text-lg mb-1">No notes yet</p>
            <p className="text-sm text-gray-500">Be the first to share what you noticed in Bali.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <article
                key={n.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold">
                    {TYPE_LABEL[n.targetType] || n.targetType}
                  </span>
                  {n.rating != null && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-bold">
                      ★ {n.rating}
                    </span>
                  )}
                  <span className="text-gray-400 ml-auto">{fmt(n.createdAt)}</span>
                </div>
                <Link
                  href={TYPE_HREF(n.targetType, n.targetKey)}
                  className="block font-bold text-sm text-gray-900 hover:text-[#0071CE] mb-1.5"
                >
                  {n.targetTitle || n.targetKey}
                </Link>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-5">
                  {n.body}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-500">
                  {n.user.image ? (
                    <OptimizedImage
                      src={n.user.image}
                      alt={n.user.name || ""}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200" />
                  )}
                  {n.user.name || "Traveler"}
                </div>
              </article>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => load(false)}
                  disabled={loading}
                  className="px-5 py-2 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
