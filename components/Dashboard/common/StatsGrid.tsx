import type { AccentColor } from "./DashboardPageHeader";

const textColors: Record<AccentColor, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  violet: "text-violet-400",
  orange: "text-orange-400",
  sky: "text-sky-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
};

export interface StatItem {
  label: string;
  value: number | string;
  color: AccentColor;
}

export default function StatsGrid({
  stats,
  isLoading = false,
  columns = 4,
}: {
  stats: StatItem[];
  isLoading?: boolean;
  columns?: 3 | 4;
}) {
  const gridCols = columns === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {s.label}
          </p>
          <p
            className={`text-3xl font-black ${textColors[s.color]}`}
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {isLoading ? "\u2014" : s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
