"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useConfirm } from "@/components/common/ConfirmDialog";
import BookFromItineraryButton from "@/components/ai/BookFromItineraryButton";

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
  const confirm = useConfirm();
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

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to legacy fallback
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const performRemove = async (id: number) => {
    try {
      const res = await fetch(`/api/itineraries?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("We couldn't delete this itinerary", {
          description: data?.error || "Please try again in a moment.",
        });
        return;
      }
      setItems((s) => s.filter((x) => x.id !== id));
      toast.success("Itinerary deleted");
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please check your connection and try again.",
      });
    }
  };

  const remove = async (id: number, title: string) => {
    const ok = await confirm({
      title: "Delete this itinerary?",
      description: `"${title}" will be permanently removed from your account. Any public share link will stop working. This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
      icon: "🗑️",
    });
    if (ok) performRemove(id);
  };

  const copyShare = async (slug: string) => {
    const url = `${window.location.origin}/share/itinerary/${slug}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      toast.success("Share link copied to your clipboard", {
        description: url,
        duration: 5000,
        action: {
          label: "Open",
          onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
        },
      });
    } else {
      toast("Copy your share link", {
        description: url,
        duration: 9000,
        action: {
          label: "Copy",
          onClick: () => {
            copyToClipboard(url).then((done) => {
              if (done) toast.success("Link copied");
              else
                toast.error("Copy not supported on this device", {
                  description: "Long-press the link in this toast to copy it manually.",
                });
            });
          },
        },
      });
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
    <>
      <div className="flex justify-end mb-4">
        <Link
          href="/ai/plan"
          className="shrink-0 px-4 py-2 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-lg transition shadow-sm"
        >
          + New Plan
        </Link>
      </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-900 font-bold text-lg mb-1">No itineraries yet</p>
            <p className="text-sm text-gray-500 mb-6">Build your first AI Bali plan in 30 seconds.</p>
            <Link
              href="/ai/plan"
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
                  <BookFromItineraryButton itineraryId={it.id} />
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
                    onClick={() => remove(it.id, it.title)}
                    className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                    aria-label={`Delete ${it.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
