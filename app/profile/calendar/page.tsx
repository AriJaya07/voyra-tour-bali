"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import MonthSwitcher from "@/components/calendar/MonthSwitcher";
import DayPanel from "@/components/calendar/DayPanel";
import EventFormDialog from "@/components/calendar/EventFormDialog";
import { useCalendarEvents } from "@/utils/hooks/useCalendarEvents";
import type { CalendarEventDTO, DayEntry } from "@/components/calendar/types";
import PlusIcon from "@/components/assets/dashboard/PlusIcon";
import { expandOccurrences, parseRRule } from "@/lib/calendar/recurrence";

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

interface DatedNote {
  id: number;
  targetTitle: string | null;
  targetKey: string;
  targetType: string;
  date: string | null;
}

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  // Pad ±1 month so neighboring days from grid still show events.
  first.setDate(first.getDate() - 7);
  last.setDate(last.getDate() + 7);
  return { from: isoDay(first), to: isoDay(last) };
}

export default function CalendarPage() {
  const { status } = useSession();
  const [cursor, setCursor] = useState(() => new Date());
  const [trips, setTrips] = useState<ImportedTrip[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [notes, setNotes] = useState<DatedNote[]>([]);
  const [staticLoading, setStaticLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventDTO | null>(null);

  const { from, to } = useMemo(() => monthRange(cursor), [cursor]);
  const {
    events,
    loading: eventsLoading,
    create,
    update,
    remove,
  } = useCalendarEvents({ from, to, enabled: status === "authenticated" });

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const [t, i, n] = await Promise.all([
          fetch("/api/imported-trips", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
          fetch("/api/itineraries", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
          fetch("/api/notes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (cancelled) return;
        setTrips(Array.isArray(t) ? t : []);
        setItineraries(Array.isArray(i) ? i : []);
        setNotes(Array.isArray(n) ? n : []);
      } finally {
        if (!cancelled) setStaticLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    const push = (key: string, ev: DayEntry) => {
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
    for (const n of notes) {
      if (!n.date) continue;
      const key = isoDay(new Date(n.date));
      push(key, {
        date: key,
        type: "note",
        title: n.targetTitle || n.targetKey,
        href: `/profile/notes`,
      });
    }
    const rangeStart = new Date(`${from}T00:00:00Z`);
    const rangeEnd = new Date(`${to}T00:00:00Z`);
    for (const e of events) {
      const base = new Date(e.date);
      const rule = parseRRule(e.recurrence);
      if (rule && e.recurrenceUntil) {
        rule.until = new Date(e.recurrenceUntil);
      }
      const occurrenceKeys = rule
        ? expandOccurrences(base, rule, rangeStart, rangeEnd)
        : [e.date.slice(0, 10)];
      for (const key of occurrenceKeys) {
        push(key, {
          date: key,
          type: "event",
          title: e.title,
          color: (e.color as DayEntry["color"]) || "blue",
          startTime: e.startTime,
          hasNote: !!e.noteId,
          event: e,
        });
      }
    }

    // Sort each day: events with start time first, then itinerary, then trip
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aT = a.startTime || "99:99";
        const bT = b.startTime || "99:99";
        return aT.localeCompare(bT);
      });
    }
    return map;
  }, [trips, itineraries, events, notes, from, to]);

  const selectedDate = selectedKey ? new Date(`${selectedKey}T00:00:00`) : null;
  const selectedEntries = selectedKey ? entriesByDay.get(selectedKey) ?? [] : [];

  const openCreate = (dateKey: string) => {
    setEditing(null);
    setSelectedKey(dateKey);
    setDialogOpen(true);
  };

  const openEdit = (event: CalendarEventDTO) => {
    setEditing(event);
    setDialogOpen(true);
  };

  const handleSubmit = async (input: Parameters<typeof create>[0]) => {
    if (editing) {
      await update(editing.id, input);
      toast.success("Event updated");
    } else {
      await create(input);
      toast.success("Event added to your calendar");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    await remove(editing.id);
  };

  const handleMoveEvent = async (eventId: number, fromKey: string, toKey: string) => {
    const target = events.find((e) => e.id === eventId);
    if (target?.recurrence) {
      toast.error("Recurring event", {
        description: "Open the event to change the series start date or repeat rules.",
      });
      return;
    }
    try {
      await update(eventId, { date: toKey });
      toast.success("Event rescheduled", {
        description: `Moved from ${fromKey} to ${toKey}.`,
      });
    } catch (err) {
      toast.error("Could not reschedule", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const exportIcs = () => {
    window.location.href = "/api/calendar-events/export";
  };

  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/calendar-share", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setShareEnabled(!!data.enabled);
        setShareSlug(data.slug ?? null);
      } catch {
        // silent: feature is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const toggleShare = async (enable: boolean) => {
    setShareBusy(true);
    try {
      const res = await fetch("/api/profile/calendar-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not update share", {
          description: data?.error || "Please try again in a moment.",
        });
        return;
      }
      const data = await res.json();
      setShareEnabled(!!data.enabled);
      setShareSlug(data.slug ?? null);
      toast.success(enable ? "Public calendar link is now live" : "Public calendar disabled", {
        description: enable
          ? "Anyone with the link can see your public events."
          : "The previous link no longer works.",
      });
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please try again.",
      });
    } finally {
      setShareBusy(false);
    }
  };

  const rotateShareSlug = async () => {
    setShareBusy(true);
    try {
      const res = await fetch("/api/profile/calendar-share", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not rotate link");
        return;
      }
      const data = await res.json();
      setShareEnabled(false);
      setShareSlug(data.slug ?? null);
      toast.success("Old link revoked", {
        description: "Re-enable sharing to publish a new link.",
      });
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareSlug || !shareEnabled) return;
    const url = `${window.location.origin}/share/calendar/${shareSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Calendar share link copied", {
        description: url,
        action: {
          label: "Open",
          onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
        },
      });
    } catch {
      toast(url, {
        description: "Long-press to copy.",
      });
    }
  };

  if (status === "loading" || (status === "authenticated" && staticLoading)) {
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

  const todayKey = isoDay(new Date());
  const defaultDialogDate = selectedKey || todayKey;

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <BackLink href="/profile" label="Back to profile" />
        </div>
        <div className="flex items-end justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Trip Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bookings, itineraries, and your own events — all in one view.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={exportIcs}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-100"
              title="Download .ics file"
            >
              ⬇ Export
            </button>
            <button
              type="button"
              onClick={() => openCreate(selectedKey || todayKey)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add event
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm mb-5">
          <div className="mb-4">
            <MonthSwitcher
              cursor={cursor}
              onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              onToday={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedKey(isoDay(now));
              }}
            />
          </div>

          <CalendarMonthGrid
            cursor={cursor}
            entriesByDay={entriesByDay}
            selectedKey={selectedKey}
            onSelectDay={(key) => setSelectedKey(key)}
            onMoveEvent={handleMoveEvent}
          />

          <p className="hidden sm:block mt-3 text-[11px] text-gray-400">
            Tip: drag a blue event chip to another day to reschedule.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Booking
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Itinerary
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Event
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Note
            </span>
            {eventsLoading && <span className="text-gray-400">Loading events…</span>}
          </div>
        </div>

        <DayPanel
          date={selectedDate}
          entries={selectedEntries}
          onAdd={() => openCreate(selectedKey || todayKey)}
          onEditEvent={openEdit}
          onClose={() => setSelectedKey(null)}
        />

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mt-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm">Public share link</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Share a read-only calendar with travel buddies. Only events you mark{" "}
                <span className="font-bold">Public</span> appear.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleShare(!shareEnabled)}
              disabled={shareBusy}
              aria-pressed={shareEnabled}
              className={`shrink-0 px-4 py-2 text-xs font-bold rounded-full border transition ${
                shareEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
              }`}
            >
              {shareEnabled ? "Sharing on" : "Sharing off"}
            </button>
          </div>
          {shareEnabled && shareSlug && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyShareLink}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition"
              >
                Copy share link
              </button>
              <button
                type="button"
                onClick={rotateShareSlug}
                disabled={shareBusy}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition"
              >
                Revoke &amp; rotate
              </button>
            </div>
          )}
        </div>
      </div>

      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultDate={defaultDialogDate}
        initial={editing}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </div>
  );
}
