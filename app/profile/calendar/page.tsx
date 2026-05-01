"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ImportedTrip {
  id: number;
  productTitle: string;
  productImage: string | null;
  travelDate: string | null;
  href: string | null;
}

interface Itinerary {
  id: number;
  title: string;
  fromDate: string | null;
  toDate: string | null;
}

interface CalEvent {
  date: string; // YYYY-MM-DD
  type: "trip" | "itinerary";
  title: string;
  href?: string;
  imageUrl?: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function eachDayOfMonth(d: Date) {
  const first = startOfMonth(d);
  const days: Date[] = [];
  // Pad start
  for (let i = 0; i < first.getDay(); i++) {
    const pad = new Date(first);
    pad.setDate(pad.getDate() - (first.getDay() - i));
    days.push(pad);
  }
  // Days of month
  const cursor = new Date(first);
  while (cursor.getMonth() === d.getMonth()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  // Pad end to multiple of 7
  while (days.length % 7 !== 0) {
    const pad = new Date(days[days.length - 1]);
    pad.setDate(pad.getDate() + 1);
    days.push(pad);
  }
  return days;
}

export default function CalendarPage() {
  const { status } = useSession();
  const [cursor, setCursor] = useState(() => new Date());
  const [trips, setTrips] = useState<ImportedTrip[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") return;
    (async () => {
      try {
        const [t, i] = await Promise.all([
          fetch("/api/imported-trips", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
          fetch("/api/itineraries", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        ]);
        setTrips(Array.isArray(t) ? t : []);
        setItineraries(Array.isArray(i) ? i : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const push = (key: string, ev: CalEvent) => {
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    };

    for (const t of trips) {
      if (!t.travelDate) continue;
      const key = isoDay(new Date(t.travelDate));
      push(key, {
        date: key,
        type: "trip",
        title: t.productTitle,
        href: t.href ?? undefined,
        imageUrl: t.productImage,
      });
    }
    for (const it of itineraries) {
      if (!it.fromDate) continue;
      const startD = new Date(it.fromDate);
      const endD = it.toDate ? new Date(it.toDate) : startD;
      const cur = new Date(startD);
      while (cur <= endD) {
        push(isoDay(cur), { date: isoDay(cur), type: "itinerary", title: it.title });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [trips, itineraries]);

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

  const days = eachDayOfMonth(cursor);
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to Profile
          </Link>
        </div>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">Your imported trips + saved itineraries.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="px-3 py-1.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              ←
            </button>
            <h2 className="font-bold text-gray-900">{monthLabel}</h2>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="px-3 py-1.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const key = isoDay(d);
              const evs = eventsByDay.get(key) ?? [];
              const isToday = key === isoDay(new Date());
              return (
                <div
                  key={i}
                  className={`min-h-[72px] sm:min-h-[88px] rounded-lg border p-1.5 text-[11px] ${
                    inMonth ? "bg-white border-gray-100" : "bg-gray-50 border-transparent text-gray-300"
                  } ${isToday ? "ring-2 ring-[#0071CE]" : ""}`}
                >
                  <div className={`font-bold mb-1 ${inMonth ? "text-gray-900" : "text-gray-300"}`}>
                    {d.getDate()}
                  </div>
                  {evs.slice(0, 2).map((e, idx) => (
                    <div
                      key={idx}
                      className={`truncate px-1 py-0.5 rounded text-[10px] mb-0.5 ${
                        e.type === "trip"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                      title={e.title}
                    >
                      {e.type === "trip" ? "🎫" : "📋"} {e.title}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div className="text-[10px] text-gray-400">+{evs.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-blue-100 border border-blue-200" /> Imported trip
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-100 border border-amber-200" /> Itinerary
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
