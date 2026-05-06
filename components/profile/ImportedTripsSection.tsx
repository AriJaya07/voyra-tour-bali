"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { CloseIcon } from "@/components/assets/Icon/shared";
import { buildViatorProductUrl } from "@/lib/config/viator";

// Extracts a Viator productCode from either a raw code or a Viator URL.
//   https://www.viator.com/tours/Bali/.../d98-12345PROD?...  →  "12345PROD"
//   12345PROD                                                  →  "12345PROD"
function extractProductCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/d\d+-([A-Za-z0-9_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_]+$/.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 32) {
    return trimmed;
  }
  return null;
}

interface ViatorImageVariant {
  height: number;
  width: number;
  url: string;
}
interface ViatorImage {
  isCover?: boolean;
  variants?: ViatorImageVariant[];
}

function pickBestImage(images: ViatorImage[] | undefined): string {
  if (!images?.length) return "";
  const cover = images.find((img) => img.isCover) ?? images[0];
  if (!cover?.variants?.length) return "";
  // Pick variant closest to 720px wide (matches plan output).
  const sorted = [...cover.variants].sort(
    (a, b) => Math.abs(a.width - 720) - Math.abs(b.width - 720)
  );
  return sorted[0]?.url ?? "";
}

interface ImportedTrip {
  id: number;
  source: string;
  externalRef: string | null;
  productTitle: string;
  productImage: string | null;
  travelDate: string | null;
  notes: string | null;
  href: string | null;
  createdAt: string;
}

const fmtDate = (d: string | null) => {
  if (!d) return "Date not set";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function ImportedTripsSection({ hasLocalBookings }: { hasLocalBookings: boolean }) {
  const confirm = useConfirm();
  const [trips, setTrips] = useState<ImportedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal form
  const [productTitle, setProductTitle] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [productImage, setProductImage] = useState("");
  const [href, setHref] = useState("");
  const [notes, setNotes] = useState("");

  // Viator auto-lookup
  const [viatorInput, setViatorInput] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupOk, setLookupOk] = useState(false);

  const lookupViator = async () => {
    const code = extractProductCode(viatorInput);
    if (!code) {
      toast.error("Couldn't read Viator code", {
        description: "Paste the full Viator product URL or just the product code.",
      });
      return;
    }
    setLookupBusy(true);
    setLookupOk(false);
    try {
      const res = await fetch(`/api/viator?action=product_detail&productCode=${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Viator lookup failed", {
          description: data?.error || "We couldn't find that product. Try the manual fields below.",
        });
        return;
      }
      const data = await res.json();
      const imgUrl = pickBestImage(data?.images);
      const t = typeof data?.title === "string" ? data.title : "";
      if (t) setProductTitle(t);
      if (imgUrl) setProductImage(imgUrl);
      setHref(buildViatorProductUrl(code, t || null));
      // If user hasn't typed a booking ref yet, seed it with the productCode.
      if (!externalRef.trim()) setExternalRef(code);
      setLookupOk(true);
      toast.success("Pulled from Viator", {
        description: t ? `Loaded: ${t}` : "Image and link filled in.",
      });
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Try again in a moment.",
      });
    } finally {
      setLookupBusy(false);
    }
  };

  const load = async () => {
    try {
      const res = await fetch("/api/imported-trips", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setProductTitle("");
    setExternalRef("");
    setTravelDate("");
    setProductImage("");
    setHref("");
    setNotes("");
    setViatorInput("");
    setLookupOk(false);
    setError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/imported-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "viator",
          productTitle,
          externalRef: externalRef || null,
          travelDate: travelDate || null,
          productImage: productImage || null,
          href: href || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to save");
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
    const ok = await confirm({
      title: "Remove this trip?",
      description:
        "It will be removed from your profile only. Your booking on the partner site is unaffected.",
      confirmLabel: "Remove trip",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/imported-trips?id=${id}`, { method: "DELETE" });
    setTrips((t) => t.filter((x) => x.id !== id));
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8"
      id="imported-trips"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Trips</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track tours you booked on partner sites — paste your reference here.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-4 py-2 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-lg transition shadow-sm"
        >
          + Add Booking
        </button>
      </div>

      <div className="p-6">
        {/* Helper banner */}
        {!hasLocalBookings && trips.length === 0 && !loading && (
          <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
            <strong>Heads up:</strong> Most tours are booked through our partner&apos;s secure checkout, so the
            confirmation email comes from them. Paste your booking reference below to keep all your trips in one place.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : trips.length === 0 ? (
          <div className="relative overflow-hidden text-center py-12 px-4 rounded-2xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/banner/banner-travel.png"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/40"
            />
            <div className="relative">
              <p className="text-gray-900 font-bold text-base mb-1">No imported trips yet</p>
              <p className="text-sm text-gray-600 mb-5 max-w-sm mx-auto">
                After you book a tour, paste the reference here so it shows up in your profile.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
              >
                + Add Your First Booking
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trips.map((t) => (
              <div
                key={t.id}
                className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#0071CE]/40 hover:shadow-sm transition flex flex-col"
              >
                <div className="relative h-32 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.productImage || "/images/banner/banner-travel.png"}
                    alt={t.productTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.src.endsWith("/images/banner/banner-travel.png")) return;
                      el.src = "/images/banner/banner-travel.png";
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/95 text-[10px] font-bold uppercase tracking-wider text-gray-600 rounded-full shadow-sm">
                    Imported
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-sm text-gray-900 leading-snug mb-1.5 line-clamp-2 min-h-[40px]">
                    {t.productTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">📅 {fmtDate(t.travelDate)}</p>
                  {t.externalRef && (
                    <p className="text-xs text-gray-500 mb-2 font-mono break-all">Ref: {t.externalRef}</p>
                  )}
                  {t.notes && <p className="text-xs text-gray-600 line-clamp-2 mb-3">{t.notes}</p>}
                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
                    {t.href ? (
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-3 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-100"
                      >
                        Manage on partner
                      </a>
                    ) : (
                      <Link
                        href="/contact"
                        className="flex-1 text-center px-3 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-100"
                      >
                        Need help?
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                      aria-label="Remove trip"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !submitting && setShowModal(false)}>
          <div
            className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !submitting && setShowModal(false)}
              disabled={submitting}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/20 transition disabled:opacity-50"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] px-5 py-4 pr-14 text-white">
              <h3 className="font-bold text-base">Add a Booking</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Paste details from your partner confirmation email.
              </p>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              {/* Viator quick-fill */}
              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                <label className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden>⚡</span>
                    Quick-fill from Viator
                  </span>
                  {lookupOk && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      ✓ Loaded
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viatorInput}
                    onChange={(e) => {
                      setViatorInput(e.target.value);
                      setLookupOk(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void lookupViator();
                      }
                    }}
                    placeholder="Paste Viator URL or product code"
                    maxLength={500}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={lookupViator}
                    disabled={lookupBusy || !viatorInput.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm whitespace-nowrap"
                  >
                    {lookupBusy ? "Looking…" : "Look up"}
                  </button>
                </div>
                <p className="text-[10px] text-blue-700/80 mt-1.5 leading-relaxed">
                  We&apos;ll pull the real tour image, title, and manage-link from Viator. You can still edit below.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span className="flex-1 h-px bg-gray-200" />
                Or fill manually
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tour title *</label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                  placeholder="e.g. Mt Batur Sunrise Trek"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Booking reference</label>
                <input
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. BR-1234567 or 12-DAYTOUR-XYZ"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
                <p className="text-[10px] text-gray-400 mt-1">Found in your confirmation email.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Travel date</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tour image URL</label>
                  <input
                    type="url"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    maxLength={500}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                  />
                </div>
              </div>

              {productImage && (
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productImage}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Manage-booking link</label>
                <input
                  type="url"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  maxLength={500}
                  placeholder="https://www.viator.com/manage/..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Pickup time, special requests, etc."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || productTitle.trim().length < 2}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition disabled:opacity-60 shadow-sm"
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
