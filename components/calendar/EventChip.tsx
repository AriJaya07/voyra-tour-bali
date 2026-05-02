import { COLOR_CLASSES, TYPE_CLASSES, type DayEntry } from "./types";

interface Props {
  entry: DayEntry;
  compact?: boolean;
  onClick?: () => void;
}

const ICON: Record<DayEntry["type"], string> = {
  trip: "🎫",
  itinerary: "📋",
  event: "📌",
  note: "📝",
};

export default function EventChip({ entry, compact = false, onClick }: Props) {
  const colorKey = entry.type === "event" ? entry.color || "blue" : null;
  const styles = colorKey ? COLOR_CLASSES[colorKey] : null;
  const typeStyles = TYPE_CLASSES[entry.type];
  const chipClass = styles ? styles.chip : typeStyles.chip;

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={entry.title}
      className={`w-full truncate text-left rounded border px-1.5 py-0.5 ${chipClass} ${
        compact ? "text-[10px]" : "text-xs"
      } ${onClick ? "hover:brightness-95 cursor-pointer transition" : ""}`}
    >
      <span className="mr-0.5" aria-hidden>
        {ICON[entry.type]}
      </span>
      {entry.startTime && !compact && (
        <span className="font-bold mr-1">{entry.startTime}</span>
      )}
      <span className="truncate">{entry.title}</span>
      {entry.hasNote && (
        <span className="ml-1" aria-label="Has linked note">
          📝
        </span>
      )}
    </Tag>
  );
}
