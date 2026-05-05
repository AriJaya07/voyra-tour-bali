"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/assets/Icon/shared";

interface NoteForView {
  id: number;
  targetType: string;
  targetTitle: string | null;
  targetKey: string;
  rating: number | null;
  body: string;
  date: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
}

interface Props {
  open: boolean;
  note: NoteForView | null;
  onClose: () => void;
  onAddToCalendar?: (note: NoteForView) => void;
  onDelete?: (note: NoteForView) => void;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default function NoteViewDialog({ open, note, onClose, onAddToCalendar, onDelete }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !note) return null;

  const calendarHref = note.date
    ? `/trips/calendar?date=${note.date.slice(0, 10)}`
    : "/trips/calendar";

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
        <div className="px-5 py-4 pr-14 bg-gradient-to-r from-amber-50 to-white border-l-4 border-amber-400">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">{note.targetType}</p>
          <h3 className="font-bold text-base text-gray-900 mt-0.5 leading-snug">
            {note.targetTitle || note.targetKey}
          </h3>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                note.visibility === "PUBLIC"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {note.visibility === "PUBLIC" ? "🌍 Public" : "🔒 Private"}
            </span>
            {note.date && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                📅 {fmt(note.date)}
              </span>
            )}
            <span className="text-[11px] text-gray-400 self-center">Saved {fmt(note.createdAt)}</span>
          </div>

          {note.rating != null && note.rating > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < (note.rating ?? 0) ? "text-amber-500" : "text-gray-200"}>
                  ★
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.body}</p>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
          {onAddToCalendar && (
            <button
              type="button"
              onClick={() => onAddToCalendar(note)}
              className="flex-1 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              📅 Add to calendar
            </button>
          )}
          <Link
            href={calendarHref}
            className="px-4 py-2.5 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-100 text-center"
          >
            Open calendar
          </Link>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(note)}
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
