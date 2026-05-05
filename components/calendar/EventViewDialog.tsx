"use client";

import { useEffect } from "react";
import Link from "next/link";
import { COLOR_CLASSES, type CalendarEventDTO, type EventColor } from "./types";
import { parseRRule } from "@/lib/calendar/recurrence";
import { CloseIcon } from "@/components/assets/Icon/shared";

interface Props {
  open: boolean;
  event: CalendarEventDTO | null;
  onClose: () => void;
  onEdit: (event: CalendarEventDTO) => void;
  onDelete?: (event: CalendarEventDTO) => void;
}

const FREQ_LABEL: Record<string, string> = {
  DAILY: "Repeats daily",
  WEEKLY: "Repeats weekly",
  MONTHLY: "Repeats monthly",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventViewDialog({ open, event, onClose, onEdit, onDelete }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !event) return null;

  const color: EventColor = (event.color as EventColor) || "blue";
  const chipCls = COLOR_CLASSES[color].chip;
  const rule = parseRRule(event.recurrence);
  const repeatLabel = rule ? FREQ_LABEL[rule.freq] ?? "Repeats" : null;
  const note = event.baliNote;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-hide shadow-2xl rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        <div className={`px-5 py-4 pr-14 border-l-4 ${COLOR_CLASSES[color].dot.replace("bg-", "border-")} bg-gradient-to-r from-gray-50 to-white`}>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Calendar event</p>
          <h3 className="font-bold text-base text-gray-900 mt-0.5 leading-snug">{event.title}</h3>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${chipCls}`}>
              📅 {fmtDate(event.date)}
            </span>
            {event.startTime && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-gray-200 text-gray-700">
                🕒 {event.startTime}
                {event.endTime ? `–${event.endTime}` : ""}
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                event.visibility === "PUBLIC"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {event.visibility === "PUBLIC" ? "🌍 Public" : "🔒 Private"}
            </span>
            {repeatLabel && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-gray-200 text-gray-700">
                🔁 {repeatLabel}
              </span>
            )}
          </div>

          {event.location && (
            <p>
              <span className="font-bold text-gray-900">Location: </span>
              📍 {event.location}
            </p>
          )}

          {event.notes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{event.notes}</p>
            </div>
          )}

          {note && (
            <Link
              href={`/profile/notes#note-${note.id}`}
              className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:bg-emerald-100 transition"
            >
              <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-0.5">
                📝 Linked Bali Note
              </p>
              <p className="font-bold text-sm text-emerald-900 leading-snug">
                {note.targetTitle || `Note #${note.id}`}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {note.targetType}
                {note.rating ? ` · ★ ${note.rating}` : ""} — tap to open
              </p>
            </Link>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="flex-1 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            ✎ Edit
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(event)}
              className="px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
