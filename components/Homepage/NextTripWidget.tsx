"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ImportedTrip {
  id: number;
  productTitle: string;
  productImage: string | null;
  travelDate: string | null;
  href: string | null;
}

function daysUntil(dateStr: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

export default function NextTripWidget() {
  const { status } = useSession();
  const [trip, setTrip] = useState<ImportedTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/imported-trips", { cache: "no-store" });
        if (!res.ok) return;
        const data: ImportedTrip[] = await res.json();
        if (cancelled) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (Array.isArray(data) ? data : [])
          .filter((t) => t.travelDate && new Date(t.travelDate) >= today)
          .sort((a, b) => new Date(a.travelDate!).getTime() - new Date(b.travelDate!).getTime());
        setTrip(upcoming[0] ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated" || loading || !trip || !trip.travelDate) return null;

  const days = daysUntil(trip.travelDate);
  const headline =
    days === 0
      ? "Your tour is today!"
      : days === 1
        ? "Your tour is tomorrow"
        : `Your next tour in ${days} days`;

  return (
    <section className="pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0071CE] to-[#005ba6] text-white shadow-md">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-200 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row gap-4 p-5 sm:p-6">
          {trip.productImage && (
            <div className="w-full sm:w-32 h-28 sm:h-24 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trip.productImage} alt={trip.productTitle} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">My Next Trip</p>
            <h2 className="text-lg sm:text-xl font-black leading-tight mt-1">{headline}</h2>
            <p className="text-sm text-blue-100 mt-1 truncate">{trip.productTitle}</p>
            <p className="text-xs text-blue-200 mt-1">{fmtDate(trip.travelDate)}</p>
          </div>
          <div className="flex items-stretch gap-2 sm:flex-col sm:justify-center">
            <Link
              href="/profile#imported-trips"
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-[#0071CE] bg-white rounded-lg hover:bg-blue-50 transition shadow-sm"
            >
              View Trip
            </Link>
            <Link
              href="/trust-and-safety"
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg transition"
            >
              Pre-trip Tips
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
