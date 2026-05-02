"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EVENT_COLORS, COLOR_CLASSES, type CalendarEventDTO, type EventColor } from "./types";
import { buildRRule, parseRRule, type Frequency } from "@/lib/calendar/recurrence";
import { useConfirm } from "@/components/common/ConfirmDialog";

type RepeatPreset = "none" | "daily" | "weekly" | "monthly";

function presetFromRule(rule: string | null): RepeatPreset {
  const parsed = parseRRule(rule);
  if (!parsed) return "none";
  if (parsed.freq === "DAILY") return "daily";
  if (parsed.freq === "WEEKLY") return "weekly";
  if (parsed.freq === "MONTHLY") return "monthly";
  return "none";
}

interface NoteOption {
  id: number;
  targetTitle: string | null;
  targetType: string;
}

interface PrefillData {
  title?: string;
  notes?: string;
  noteId?: number;
  color?: EventColor;
}

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  initial?: CalendarEventDTO | null;
  prefill?: PrefillData | null;
  onSubmit: (input: {
    title: string;
    date: string;
    notes: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    color: EventColor;
    noteId: number | null;
    recurrence: string | null;
    recurrenceUntil: string | null;
    visibility: "PRIVATE" | "PUBLIC";
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function EventFormDialog({
  open,
  onClose,
  defaultDate,
  initial,
  prefill,
  onSubmit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<EventColor>("blue");
  const [noteId, setNoteId] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<RepeatPreset>("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteOptions, setNoteOptions] = useState<NoteOption[]>([]);
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDate(initial.date.slice(0, 10));
      setStartTime(initial.startTime || "");
      setEndTime(initial.endTime || "");
      setLocation(initial.location || "");
      setNotes(initial.notes || "");
      setColor((initial.color as EventColor) || "blue");
      setNoteId(initial.noteId);
      setRepeat(presetFromRule(initial.recurrence));
      setRepeatUntil(initial.recurrenceUntil ? initial.recurrenceUntil.slice(0, 10) : "");
      setVisibility(initial.visibility || "PRIVATE");
    } else {
      setTitle(prefill?.title ?? "");
      setDate(defaultDate);
      setStartTime("");
      setEndTime("");
      setLocation("");
      setNotes(prefill?.notes ?? "");
      setColor(prefill?.color ?? "blue");
      setNoteId(prefill?.noteId ?? null);
      setRepeat("none");
      setRepeatUntil("");
      setVisibility("PRIVATE");
    }
  }, [open, initial, defaultDate, prefill]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notes", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as NoteOption[];
        if (!cancelled) setNoteOptions(Array.isArray(data) ? data : []);
      } catch {
        // silent: linking is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Add a title", { description: "At least 2 characters." });
      return;
    }
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    if (startTime && endTime && endTime < startTime) {
      toast.error("End time must be after start time");
      return;
    }
    setSubmitting(true);
    try {
      let recurrence: string | null = null;
      if (repeat !== "none") {
        const freq: Frequency =
          repeat === "daily" ? "DAILY" : repeat === "weekly" ? "WEEKLY" : "MONTHLY";
        recurrence = buildRRule({ freq });
      }
      await onSubmit({
        title: title.trim(),
        date,
        notes: notes.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location.trim() || null,
        color,
        noteId,
        recurrence,
        recurrenceUntil: repeat !== "none" && repeatUntil ? repeatUntil : null,
        visibility,
      });
      onClose();
    } catch (err) {
      toast.error("Could not save event", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDelete = async () => {
    if (!onDelete) return;
    const ok = await confirm({
      title: `Delete "${title}"?`,
      description: initial?.recurrence
        ? "This will permanently remove the event series and every occurrence on your calendar."
        : "This will permanently remove the event from your calendar.",
      confirmLabel: "Delete event",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete();
      toast.success("Event deleted");
      onClose();
    } catch (err) {
      toast.error("Could not delete event", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !submitting && !deleting && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] px-5 py-4 text-white">
          <h3 className="font-bold text-base">{initial ? "Edit event" : "New event"}</h3>
          <p className="text-xs text-blue-100 mt-0.5">
            {initial ? "Update or remove this entry." : "Plan an activity, meal, or reminder."}
          </p>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="Dinner at Locavore"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="Ubud, Bali"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`${c} color`}
                  aria-pressed={color === c}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition ${COLOR_CLASSES[c].dot} ${
                    color === c ? "ring-2 ring-gray-900" : "ring-0 hover:ring-1 ring-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Anything to remember…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Repeat</label>
            <div className="flex gap-2 flex-wrap">
              {(["none", "daily", "weekly", "monthly"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRepeat(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition capitalize ${
                    repeat === r
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {r === "none" ? "Doesn't repeat" : r}
                </button>
              ))}
            </div>
            {repeat !== "none" && (
              <div className="mt-2">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Repeat until (optional)
                </label>
                <input
                  type="date"
                  value={repeatUntil}
                  min={date}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Visibility</label>
            <div className="flex gap-2">
              {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition capitalize ${
                    visibility === v
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                  }`}
                >
                  {v === "PRIVATE" ? "🔒 Private" : "🌍 Public"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              Public events appear on your shared calendar link (if enabled).
            </p>
          </div>

          {noteOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Link to a Bali Note</label>
              <select
                value={noteId ?? ""}
                onChange={(e) => setNoteId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] bg-white"
              >
                <option value="">— None —</option>
                {noteOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.targetTitle || `Note #${n.id}`} ({n.targetType})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || deleting}
              className="flex-1 px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              {submitting ? "Saving…" : initial ? "Save changes" : "Add event"}
            </button>
            {initial && onDelete && (
              <button
                type="button"
                onClick={triggerDelete}
                disabled={submitting || deleting}
                className="px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-100"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || deleting}
              className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
