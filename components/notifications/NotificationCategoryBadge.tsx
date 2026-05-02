interface Props {
  category: string;
  className?: string;
}

const STYLES: Record<string, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  SYSTEM: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    label: "System",
    emoji: "⚙️",
  },
  DEAL: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Deal",
    emoji: "🎁",
  },
  TRAVEL: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Travel",
    emoji: "✈️",
  },
  ALERT: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Alert",
    emoji: "⚠️",
  },
  NEWS: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "News",
    emoji: "📰",
  },
};

export default function NotificationCategoryBadge({ category, className = "" }: Props) {
  const s = STYLES[category] ?? STYLES.SYSTEM;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border} ${className}`}
    >
      <span aria-hidden>{s.emoji}</span>
      {s.label}
    </span>
  );
}
