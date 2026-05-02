"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Note {
  id: number;
  targetTitle: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

interface Props {
  targetType: "tour" | "destination" | "place";
  targetKey: string;
  title?: string;
  limit?: number;
  className?: string;
}

const fmtRel = (dateStr: string) => {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (24 * 3600 * 1000));
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

export default function PublicNotesBlock({
  targetType,
  targetKey,
  title = "Traveler Notes",
  limit = 6,
  className = "",
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/notes/public?targetType=${encodeURIComponent(targetType)}&targetKey=${encodeURIComponent(targetKey)}&limit=${limit}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setNotes(data.items || []);
        setTotal(data.total || 0);
        setRatingAvg(data.ratingAvg);
        setRatingCount(data.ratingCount || 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetKey, limit]);

  if (loading) return null;
  if (notes.length === 0) return null;

  return (
    <section className={`py-6 ${className}`} aria-label={title}>
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} note{total === 1 ? "" : "s"} from real travelers
            {ratingAvg !== null && ratingCount > 0 && (
              <>
                {" "}
                · ★ {ratingAvg.toFixed(1)} ({ratingCount} rated)
              </>
            )}
          </p>
        </div>
        {total > limit && (
          <Link
            href={`/notes/${targetType}/${encodeURIComponent(targetKey)}`}
            className="text-xs font-bold text-[#0071CE] hover:underline shrink-0"
          >
            See all →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {notes.map((n) => (
          <article
            key={n.id}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-2 mb-2">
              {n.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={n.user.image}
                  alt={n.user.name || "Traveler"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {(n.user.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-xs truncate">
                  {n.user.name || "Anonymous traveler"}
                </p>
                <p className="text-[11px] text-gray-400">{fmtRel(n.createdAt)}</p>
              </div>
              {n.rating && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-xs ${i < (n.rating ?? 0) ? "text-amber-500" : "text-gray-200"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-5 whitespace-pre-wrap">
              {n.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
