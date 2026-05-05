"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import EventFormDialog from "@/components/calendar/EventFormDialog";
import EventViewDialog from "@/components/calendar/EventViewDialog";
import NoteViewDialog from "@/components/notes/NoteViewDialog";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { COLOR_CLASSES, type CalendarEventDTO, type EventColor } from "@/components/calendar/types";

interface BaliNote {
  id: number;
  targetType: string;
  targetKey: string;
  targetTitle: string | null;
  rating: number | null;
  body: string;
  date: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
}

type FeedItem =
  | { kind: "note"; createdAt: string; note: BaliNote }
  | { kind: "event"; createdAt: string; event: CalendarEventDTO };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function BaliNotesPage() {
  const { status } = useSession();
  const confirm = useConfirm();
  const [notes, setNotes] = useState<BaliNote[]>([]);
  const [events, setEvents] = useState<CalendarEventDTO[]>([]);
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
  const [noteDate, setNoteDate] = useState("");

  // Add-to-calendar dialog
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPrefill, setCalendarPrefill] = useState<{
    title: string;
    noteId: number;
    notesText: string;
    defaultDate: string;
  } | null>(null);

  // View dialogs
  const [viewingNote, setViewingNote] = useState<BaliNote | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEventDTO | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDTO | null>(null);

  const load = async () => {
    try {
      const [notesRes, eventsRes] = await Promise.all([
        fetch("/api/notes", { cache: "no-store" }),
        fetch("/api/calendar-events", { cache: "no-store" }),
      ]);
      if (notesRes.ok) {
        const data = await notesRes.json();
        setNotes(Array.isArray(data) ? data : []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(Array.isArray(data) ? data : []);
      }
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
    setNoteDate("");
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
          date: noteDate || null,
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

  const performDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not delete note", {
          description: data?.error || "Please try again in a moment.",
        });
        return;
      }
      setNotes((n) => n.filter((x) => x.id !== id));
      toast.success("Note deleted");
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please try again.",
      });
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      description: "This will permanently remove the note. This action cannot be undone.",
      confirmLabel: "Delete note",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (ok) performDelete(id);
  };

  const performDeleteEvent = async (id: number) => {
    try {
      const res = await fetch(`/api/calendar-events?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not delete event", {
          description: data?.error || "Please try again in a moment.",
        });
        return false;
      }
      setEvents((e) => e.filter((x) => x.id !== id));
      toast.success("Event deleted");
      return true;
    } catch {
      toast.error("Network problem", {
        description: "Couldn't reach the server. Please try again.",
      });
      return false;
    }
  };

  const handleDeleteEvent = async (id: number, title: string) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      description: "This will remove the calendar event. This action cannot be undone.",
      confirmLabel: "Delete event",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    await performDeleteEvent(id);
  };

  const handleEventEditSubmit = async (input: {
    title: string;
    date: string;
    notes: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    color: string;
    noteId: number | null;
    recurrence: string | null;
    recurrenceUntil: string | null;
    visibility: "PRIVATE" | "PUBLIC";
  }) => {
    if (!editingEvent) return;
    const res = await fetch(`/api/calendar-events?id=${editingEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not update event");
    }
    toast.success("Event updated");
    await load();
  };

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...notes.map<FeedItem>((n) => ({ kind: "note", createdAt: n.createdAt, note: n })),
      ...events
        .filter((e) => !e.noteId)
        .map<FeedItem>((e) => ({ kind: "event", createdAt: e.createdAt, event: e })),
    ];
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  }, [notes, events]);

  const addToCalendar = (note: BaliNote) => {
    let dateStr: string;
    if (note.date) {
      dateStr = note.date.slice(0, 10);
    } else {
      const today = new Date();
      dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;
    }
    setCalendarPrefill({
      title: note.targetTitle || `Note: ${note.targetType}`,
      noteId: note.id,
      notesText: note.body.slice(0, 500),
      defaultDate: dateStr,
    });
    setCalendarOpen(true);
  };

  const handleCalendarSubmit = async (input: {
    title: string;
    date: string;
    notes: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    color: string;
    noteId: number | null;
    recurrence: string | null;
    recurrenceUntil: string | null;
    visibility: "PRIVATE" | "PUBLIC";
  }) => {
    const res = await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not add to calendar");
    }
    const dateLabel = new Date(`${input.date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    toast.success(`Added to your calendar on ${dateLabel}`, {
      description: "View or edit details any time from Trip Calendar.",
      action: {
        label: "Open calendar",
        onClick: () => {
          window.location.href = "/profile/calendar";
        },
      },
    });
    await load();
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
          <BackLink href="/profile" label="Back to profile" />
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

        {feed.length === 0 ? (
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
            {feed.map((item) => {
              if (item.kind === "event") {
                const e = item.event;
                const color: EventColor = (e.color as EventColor) || "blue";
                const chipCls = COLOR_CLASSES[color].chip;
                const calendarHref = `/profile/calendar?date=${e.date.slice(0, 10)}`;
                return (
                  <div
                    key={`event-${e.id}`}
                    id={`event-${e.id}`}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition scroll-mt-24"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Calendar event
                        </p>
                        <h3 className="font-bold text-gray-900 leading-snug">{e.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            e.visibility === "PUBLIC"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-50 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {e.visibility === "PUBLIC" ? "Public" : "Private"}
                        </span>
                        <button
                          onClick={() => setViewingEvent(e)}
                          className="px-2 py-1 text-[11px] font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded transition border border-blue-100"
                          title="View event"
                          aria-label="View event"
                        >
                          👁 View
                        </button>
                        <Link
                          href={calendarHref}
                          className="px-2 py-1 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition border border-gray-200"
                          title="Open in calendar"
                        >
                          📅 Calendar
                        </Link>
                        <button
                          onClick={() => handleDeleteEvent(e.id, e.title)}
                          className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition"
                          aria-label="Delete event"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {e.notes && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {e.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full border font-bold ${chipCls}`}>
                        📅 {fmtDate(e.date)}
                      </span>
                      {e.startTime && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-bold">
                          🕒 {e.startTime}
                          {e.endTime ? `–${e.endTime}` : ""}
                        </span>
                      )}
                      {e.location && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-bold">
                          📍 {e.location}
                        </span>
                      )}
                      {e.recurrence && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-bold">
                          🔁 Repeats
                        </span>
                      )}
                      <span className="text-gray-400">Saved {fmtDate(e.createdAt)}</span>
                    </div>
                  </div>
                );
              }
              const n = item.note;
              return (
              <div
                key={`note-${n.id}`}
                id={`note-${n.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition scroll-mt-24"
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
                  <div className="flex items-center gap-1.5 shrink-0">
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
                      onClick={() => setViewingNote(n)}
                      className="px-2 py-1 text-[11px] font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded transition border border-blue-100"
                      title="View note"
                      aria-label="View note"
                    >
                      👁 View
                    </button>
                    <button
                      onClick={() => addToCalendar(n)}
                      className="px-2 py-1 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition border border-gray-200"
                      title="Add to calendar"
                    >
                      📅 Calendar
                    </button>
                    <button
                      onClick={() => handleDelete(n.id, n.targetTitle || n.targetKey)}
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
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-400">
                  {n.date && (
                    <span className="text-[#0071CE] font-bold">📅 {fmtDate(n.date)}</span>
                  )}
                  <span>Saved {fmtDate(n.createdAt)}</span>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !submitting && setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    The day this note refers to. Dated notes also appear on your Trip Calendar.
                  </p>
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

      <EventFormDialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        defaultDate={calendarPrefill?.defaultDate || ""}
        prefill={
          calendarPrefill
            ? {
                title: calendarPrefill.title,
                notes: calendarPrefill.notesText,
                noteId: calendarPrefill.noteId,
                color: "green",
              }
            : null
        }
        onSubmit={handleCalendarSubmit}
      />

      <NoteViewDialog
        open={!!viewingNote}
        note={viewingNote}
        onClose={() => setViewingNote(null)}
        onAddToCalendar={(n) => {
          setViewingNote(null);
          addToCalendar(n);
        }}
        onDelete={(n) => {
          setViewingNote(null);
          handleDelete(n.id, n.targetTitle || n.targetKey);
        }}
      />

      <EventViewDialog
        open={!!viewingEvent}
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(ev) => {
          setViewingEvent(null);
          setEditingEvent(ev);
        }}
        onDelete={(ev) => {
          setViewingEvent(null);
          handleDeleteEvent(ev.id, ev.title);
        }}
      />

      <EventFormDialog
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        defaultDate={editingEvent ? editingEvent.date.slice(0, 10) : ""}
        initial={editingEvent}
        onSubmit={handleEventEditSubmit}
        onDelete={
          editingEvent
            ? async () => {
                const ok = await performDeleteEvent(editingEvent.id);
                if (ok) setEditingEvent(null);
              }
            : undefined
        }
      />
    </div>
  );
}
