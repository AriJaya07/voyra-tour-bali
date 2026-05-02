"use client";

import Link from "next/link";
import {
  COLOR_CLASSES,
  TYPE_CLASSES,
  type CalendarEventDTO,
  type DayEntry,
} from "./types";
import PlusIcon from "@/components/assets/dashboard/PlusIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";

interface Props {
  date: Date | null;
  entries: DayEntry[];
  onAdd: () => void;
  onEditEvent: (event: CalendarEventDTO) => void;
  onClose?: () => void;
}

function fmtFullDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DayPanel({ date, entries, onAdd, onEditEvent, onClose }: Props) {
  if (!date) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
        Select a day to see events.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Selected day</p>
          <h3 className="text-base font-bold text-gray-900 mt-0.5 leading-snug">
            {fmtFullDate(date)}
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close day panel"
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nothing planned for this day yet.
          </p>
        ) : (
          entries.map((entry, idx) => {
            const colorKey = entry.type === "event" ? entry.color || "blue" : null;
            const dotClass = colorKey
              ? COLOR_CLASSES[colorKey].dot
              : TYPE_CLASSES[entry.type].dot;
            const typeLabel = TYPE_CLASSES[entry.type].label;

            const editable = entry.type === "event" && entry.event;
            const inner = (
              <div className="flex items-start gap-3 w-full">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      {typeLabel}
                    </span>
                    {entry.startTime && (
                      <span className="text-[11px] font-bold text-gray-600">
                        {entry.startTime}
                      </span>
                    )}
                    {entry.hasNote && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                        title="Linked to a Bali note"
                      >
                        📝 Note
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-gray-900 leading-snug mt-0.5">
                    {entry.title}
                  </p>
                  {entry.event?.location && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {entry.event.location}</p>
                  )}
                  {entry.event?.notes && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">
                      {entry.event.notes}
                    </p>
                  )}
                </div>
                {editable && (
                  <PencilIcon className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                )}
              </div>
            );

            if (entry.type === "event" && entry.event) {
              return (
                <button
                  key={`event-${entry.event.id}`}
                  type="button"
                  onClick={() => onEditEvent(entry.event!)}
                  className="w-full text-left rounded-xl border border-gray-100 p-3 hover:border-[#0071CE]/40 hover:bg-blue-50/30 transition"
                >
                  {inner}
                </button>
              );
            }
            if (entry.href) {
              return (
                <Link
                  key={`${entry.type}-${idx}`}
                  href={entry.href}
                  className="block rounded-xl border border-gray-100 p-3 hover:border-[#0071CE]/40 hover:bg-blue-50/30 transition"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div
                key={`${entry.type}-${idx}`}
                className="rounded-xl border border-gray-100 p-3"
              >
                {inner}
              </div>
            );
          })
        )}

        <button
          type="button"
          onClick={onAdd}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Add event for this day
        </button>
      </div>
    </div>
  );
}
