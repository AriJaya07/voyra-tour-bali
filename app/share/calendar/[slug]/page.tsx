"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import MonthSwitcher from "@/components/calendar/MonthSwitcher";
import type { DayEntry } from "@/components/calendar/types";
import { expandOccurrences, parseRRule } from "@/lib/calendar/recurrence";

interface PublicEvent {
  id: number;
  title: string;
  notes: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  color: string | null;
  recurrence: string | null;
  recurrenceUntil: string | null;
}

interface ShareResponse {
  owner: { name: string };
  events: PublicEvent[];
}

export default function PublicCalendarSharePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/calendar/${slug}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json = (await res.json()) as ShareResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    if (!data) return map;
    const first = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    for (const e of data.events) {
      const base = new Date(e.date);
      const rule = parseRRule(e.recurrence);
      if (rule && e.recurrenceUntil) rule.until = new Date(e.recurrenceUntil);
      const keys = rule ? expandOccurrences(base, rule, first, last) : [e.date.slice(0, 10)];
      for (const key of keys) {
        const list = map.get(key) ?? [];
        list.push({
          date: key,
          type: "event",
          title: e.title,
          color: (e.color as DayEntry["color"]) || "blue",
          startTime: e.startTime,
        });
        map.set(key, list);
      }
    }
    return map;
  }, [data, cursor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar not found</h1>
          <p className="text-sm text-gray-600 mb-6">
            This share link is invalid or the calendar is no longer public.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  const selectedDate = selectedKey ? new Date(`${selectedKey}T00:00:00`) : null;
  const selectedEntries = selectedKey ? entriesByDay.get(selectedKey) ?? [] : [];

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-[#0071CE] to-[#005ba6] rounded-2xl p-6 sm:p-8 text-white mb-6 shadow-lg">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Shared calendar
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-1">
            {data.owner.name}&apos;s Bali plans
          </h1>
          <p className="text-blue-100 text-sm">
            Public events only. {data.events.length} entr
            {data.events.length === 1 ? "y" : "ies"}.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm mb-5">
          <div className="mb-4">
            <MonthSwitcher
              cursor={cursor}
              onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              onToday={() => setCursor(new Date())}
            />
          </div>
          <CalendarMonthGrid
            cursor={cursor}
            entriesByDay={entriesByDay}
            selectedKey={selectedKey}
            onSelectDay={(key) => setSelectedKey(key)}
          />
        </div>

        {selectedDate && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
              Selected day
            </p>
            <h3 className="text-base font-bold text-gray-900 leading-snug mb-3">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No public events on this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-100 p-3 flex items-start gap-3"
                  >
                    <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {entry.startTime && (
                        <p className="text-[11px] font-bold text-gray-600">{entry.startTime}</p>
                      )}
                      <p className="font-bold text-sm text-gray-900 leading-snug">{entry.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Powered by Voyra Bali ·{" "}
          <Link href="/" className="hover:underline">
            Plan your own trip
          </Link>
        </p>
      </div>
    </div>
  );
}
