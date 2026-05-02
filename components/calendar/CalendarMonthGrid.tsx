import { useState } from "react";
import { COLOR_CLASSES, TYPE_CLASSES, type DayEntry } from "./types";

interface Props {
  cursor: Date;
  entriesByDay: Map<string, DayEntry[]>;
  selectedKey?: string | null;
  onSelectDay: (key: string, date: Date) => void;
  onMoveEvent?: (eventId: number, fromKey: string, toKey: string) => void;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDayOfMonth(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const days: Date[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    const pad = new Date(first);
    pad.setDate(pad.getDate() - (first.getDay() - i));
    days.push(pad);
  }
  const cursor = new Date(first);
  while (cursor.getMonth() === d.getMonth()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  while (days.length % 7 !== 0) {
    const pad = new Date(days[days.length - 1]);
    pad.setDate(pad.getDate() + 1);
    days.push(pad);
  }
  return days;
}

export default function CalendarMonthGrid({
  cursor,
  entriesByDay,
  selectedKey,
  onSelectDay,
  onMoveEvent,
}: Props) {
  const days = eachDayOfMonth(cursor);
  const todayKey = isoDay(new Date());
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragEnabled = !!onMoveEvent;

  const handleDragStart = (e: React.DragEvent, eventId: number, fromKey: string) => {
    e.dataTransfer.setData("application/voyra-event", String(eventId));
    e.dataTransfer.setData("application/voyra-from", fromKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!dragEnabled) return;
    if (!e.dataTransfer.types.includes("application/voyra-event")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey !== key) setDragOverKey(key);
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    if (!dragEnabled) return;
    e.preventDefault();
    setDragOverKey(null);
    const id = parseInt(e.dataTransfer.getData("application/voyra-event"));
    const from = e.dataTransfer.getData("application/voyra-from");
    if (!id || !from || from === key) return;
    onMoveEvent?.(id, from, key);
  };

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const key = isoDay(d);
          const entries = entriesByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const visible = entries.slice(0, 2);
          const overflow = entries.length - visible.length;

          const isDragOver = dragOverKey === key;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(key, d)}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={() => setDragOverKey((cur) => (cur === key ? null : cur))}
              onDrop={(e) => handleDrop(e, key)}
              aria-pressed={isSelected}
              aria-label={`${d.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}${entries.length ? `, ${entries.length} events` : ""}`}
              className={`group relative min-h-[64px] sm:min-h-[88px] rounded-lg border p-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#0071CE] ${
                inMonth
                  ? "bg-white border-gray-100 hover:border-[#0071CE]/40 hover:bg-blue-50/30"
                  : "bg-gray-50 border-transparent text-gray-300"
              } ${isToday ? "ring-2 ring-[#0071CE]" : ""} ${
                isSelected ? "bg-blue-50 border-[#0071CE]" : ""
              } ${isDragOver ? "ring-2 ring-emerald-500 bg-emerald-50" : ""}`}
            >
              <div
                className={`text-[11px] sm:text-xs font-bold mb-1 ${
                  inMonth ? (isToday ? "text-[#0071CE]" : "text-gray-900") : "text-gray-300"
                }`}
              >
                {d.getDate()}
              </div>

              {/* Mobile: dots only */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {entries.slice(0, 4).map((e, idx) => {
                  const dot =
                    e.type === "event"
                      ? COLOR_CLASSES[e.color || "blue"].dot
                      : TYPE_CLASSES[e.type].dot;
                  return (
                    <span
                      key={idx}
                      aria-hidden
                      className={`w-1.5 h-1.5 rounded-full ${dot}`}
                    />
                  );
                })}
                {entries.length > 4 && (
                  <span className="text-[9px] text-gray-400 leading-none">
                    +{entries.length - 4}
                  </span>
                )}
              </div>

              {/* Desktop: chip preview */}
              <div className="hidden sm:flex flex-col gap-0.5">
                {visible.map((e, idx) => {
                  const styles =
                    e.type === "event"
                      ? COLOR_CLASSES[e.color || "blue"].chip
                      : TYPE_CLASSES[e.type].chip;
                  const canDrag = !!(dragEnabled && e.type === "event" && e.event);
                  return (
                    <div
                      key={idx}
                      draggable={canDrag}
                      onDragStart={
                        canDrag
                          ? (ev) => {
                              ev.stopPropagation();
                              handleDragStart(ev, e.event!.id, key);
                            }
                          : undefined
                      }
                      className={`truncate rounded border px-1 py-0.5 text-[10px] ${styles} ${
                        canDrag ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                      title={canDrag ? `${e.title} — drag to reschedule` : e.title}
                    >
                      {e.startTime ? <span className="font-bold mr-0.5">{e.startTime}</span> : null}
                      {e.title}
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-400 px-1">+{overflow} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
