export const EVENT_COLORS = ["blue", "green", "purple", "red", "amber"] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

export interface LinkedNote {
  id: number;
  targetTitle: string | null;
  targetType: string;
  rating: number | null;
}

export interface CalendarEventDTO {
  id: number;
  title: string;
  notes: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  color: EventColor | null;
  noteId: number | null;
  baliNote: LinkedNote | null;
  recurrence: string | null;
  recurrenceUntil: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
  updatedAt: string;
}

export type DayEntryType = "trip" | "itinerary" | "event" | "note";

export interface DayEntry {
  date: string;
  type: DayEntryType;
  title: string;
  href?: string;
  imageUrl?: string | null;
  color?: EventColor | null;
  startTime?: string | null;
  hasNote?: boolean;
  event?: CalendarEventDTO;
}

export const COLOR_CLASSES: Record<EventColor, { chip: string; dot: string }> = {
  blue: {
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  green: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  purple: {
    chip: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  red: {
    chip: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  amber: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

export const TYPE_CLASSES: Record<DayEntryType, { chip: string; dot: string; label: string }> = {
  trip: {
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    label: "Booking",
  },
  itinerary: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Itinerary",
  },
  event: {
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    label: "Event",
  },
  note: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Note",
  },
};
