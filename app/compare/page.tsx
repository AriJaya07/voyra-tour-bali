"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  productCode: string;
  title: string;
  description?: string;
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
  reviews?: { totalReviews?: number; combinedAverageRating?: number };
  duration?: { fixedDurationInMinutes?: number; variableDurationFromMinutes?: number };
  flags?: string[];
  inclusions?: { typeDescription?: string; description?: string }[];
  exclusions?: { typeDescription?: string; description?: string }[];
  images?: { isCover?: boolean; variants?: { url?: string }[] }[];
  itinerary?: { itineraryType?: string };
  bookingConfirmationSettings?: { confirmationType?: string };
}

const MAX_COMPARE = 4;

const fmtDuration = (mins?: number) => {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const coverImg = (p: Product) => {
  const cover = p.images?.find((i) => i.isCover) || p.images?.[0];
  return cover?.variants?.[0]?.url;
};

function CompareInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const codesParam = sp.get("codes") || "";
  const codes = codesParam.split(",").map((c) => c.trim()).filter(Boolean).slice(0, MAX_COMPARE);

  const [products, setProducts] = useState<Record<string, Product | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (codes.length === 0) return;
    setLoading(true);
    Promise.all(
      codes.map(async (code) => {
        try {
          const res = await fetch(`/api/viator?action=product_detail&productCode=${code}`);
          if (!res.ok) return [code, null] as const;
          const data = await res.json();
          return [code, data as Product] as const;
        } catch {
          return [code, null] as const;
        }
      })
    ).then((rows) => {
      const map: Record<string, Product | null> = {};
      rows.forEach(([k, v]) => (map[k] = v));
      setProducts(map);
      setLoading(false);
    });
  }, [codesParam]);

  const remove = useCallback(
    (code: string) => {
      const next = codes.filter((c) => c !== code);
      router.replace(next.length ? `/compare?codes=${next.join(",")}` : "/compare");
    },
    [codes, router]
  );

  if (codes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Compare tours</h1>
        <p className="text-gray-500 mb-6">
          Add tours to your compare list (up to {MAX_COMPARE}) to see them side-by-side.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-xl text-sm hover:bg-[#005ba6] transition"
        >
          Browse tours
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Compare tours</h1>
          <p className="text-sm text-gray-500 mt-1">
            {codes.length} of {MAX_COMPARE} · side-by-side
          </p>
        </div>
        <Link href="/" className="text-sm font-bold text-[#0071CE] hover:underline">
          + Add more
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${codes.length}, minmax(260px, 1fr))` }}
          >
            {codes.map((code) => {
              const p = products[code];
              if (!p) {
                return (
                  <div
                    key={code}
                    className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-sm text-gray-500"
                  >
                    Unable to load <span className="font-mono">{code}</span>
                    <button
                      onClick={() => remove(code)}
                      className="block mt-3 text-xs text-red-600 hover:underline mx-auto"
                    >
                      Remove
                    </button>
                  </div>
                );
              }
              const img = coverImg(p);
              const dur = p.duration?.fixedDurationInMinutes || p.duration?.variableDurationFromMinutes;
              const free = p.flags?.includes("FREE_CANCELLATION");
              const instant = p.bookingConfirmationSettings?.confirmationType === "INSTANT";
              const fromPrice = p.pricing?.summary?.fromPrice;
              const currency = p.pricing?.currency || "IDR";

              return (
                <div
                  key={code}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative h-40 bg-gray-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100" />
                    )}
                    <button
                      onClick={() => remove(code)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 text-gray-700 hover:text-red-600 text-xs font-bold shadow"
                      aria-label="Remove from compare"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-3">
                      {p.title}
                    </h3>

                    <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                      <Row label="Price from">
                        <span className="font-bold text-gray-900">
                          {fromPrice ? `${currency} ${fromPrice.toLocaleString()}` : "—"}
                        </span>
                      </Row>
                      <Row label="Rating">
                        {p.reviews?.combinedAverageRating
                          ? `★ ${p.reviews.combinedAverageRating.toFixed(1)} (${p.reviews.totalReviews || 0})`
                          : "—"}
                      </Row>
                      <Row label="Duration">{fmtDuration(dur)}</Row>
                      <Row label="Confirmation">{instant ? "Instant" : "Manual"}</Row>
                      <Row label="Free cancel">{free ? "Yes" : "No"}</Row>
                      <Row label="Itinerary">{p.itinerary?.itineraryType || "—"}</Row>
                    </div>

                    {p.inclusions && p.inclusions.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                          Included
                        </p>
                        <ul className="text-xs text-gray-700 space-y-0.5 list-disc pl-4">
                          {p.inclusions.slice(0, 5).map((inc, i) => (
                            <li key={i} className="line-clamp-1">
                              {inc.description || inc.typeDescription}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Link
                      href={`/detail/${p.productCode}`}
                      className="mt-auto block text-center px-4 py-2 bg-[#0071CE] text-white text-xs font-bold rounded-lg hover:bg-[#005ba6] transition"
                    >
                      View tour
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
