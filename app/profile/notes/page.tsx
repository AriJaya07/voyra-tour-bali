"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface BaliNote {
  id: number;
  targetType: string;
  targetKey: string;
  targetTitle: string | null;
  rating: number | null;
  body: string;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function BaliNotesPage() {
  const { status } = useSession();
  const [notes, setNotes] = useState<BaliNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [targetType, setTargetType] = useState<"tour" | "destination" | "place">("place");
  const [targetTitle, setTargetTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");

  const load = async () => {
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") return;
    load();
  }, [status]);

  const reset = () => {
    setTargetType("place");
    setTargetTitle("");
    setBody("");
    setRating(null);
    setVisibility("PRIVATE");
    setError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetKey: targetTitle.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 100),
          targetTitle: targetTitle.trim(),
          rating,
          body,
          visibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to save note");
        return;
      }
      reset();
      setShowModal(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    setNotes((n) => n.filter((x) => x.id !== id));
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">You are not signed in</h1>
          <p className="text-gray-600 mb-6">Sign in to keep your Bali travel notes.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Bali Notes</h1>
            <p className="text-sm text-gray-500 mt-1">
              Personal travel journal — places visited, tours done, tips for next time.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-lg transition shadow-sm"
          >
            + Add Note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-900 font-bold text-lg mb-1">No notes yet</p>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Write down what you loved (or didn&apos;t) about a tour, beach, restaurant, or anywhere in Bali.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
            >
              + Write Your First Note
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((n) => (
              <div
                key={n.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {n.targetType}
                    </p>
                    <h3 className="font-bold text-gray-900 leading-snug">
                      {n.targetTitle || n.targetKey}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        n.visibility === "PUBLIC"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {n.visibility === "PUBLIC" ? "Public" : "Private"}
                    </span>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition"
                      aria-label="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {n.rating && (
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={i < (n.rating ?? 0) ? "text-amber-500" : "text-gray-200"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                <p className="text-[11px] text-gray-400 mt-3">{fmtDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !submitting && setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] px-5 py-4 text-white">
                <h3 className="font-bold text-base">New Bali Note</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Anything you want to remember from your trip.
                </p>
              </div>
              <form onSubmit={handleAdd} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                  <div className="flex gap-2">
                    {(["place", "tour", "destination"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTargetType(t)}
                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition capitalize ${
                          targetType === t
                            ? "bg-[#0071CE] text-white border-[#0071CE]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                    required
                    minLength={2}
                    maxLength={200}
                    placeholder="e.g. Tegallalang Rice Terraces"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Note *</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    minLength={4}
                    maxLength={4000}
                    rows={5}
                    placeholder="What did you experience? Any tips for next time?"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rating (optional)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(rating === n ? null : n)}
                        className={`text-2xl transition ${
                          (rating ?? 0) >= n ? "text-amber-500" : "text-gray-300"
                        }`}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Visibility</label>
                  <div className="flex gap-2">
                    {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition ${
                          visibility === v
                            ? "bg-[#0071CE] text-white border-[#0071CE]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                        }`}
                      >
                        {v === "PRIVATE" ? "🔒 Private (just me)" : "🌍 Public"}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => !submitting && setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || targetTitle.trim().length < 2 || body.trim().length < 4}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
