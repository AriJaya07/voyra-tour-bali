export type AccentColor = "emerald" | "blue" | "violet" | "orange" | "sky" | "rose" | "amber";

const buttonColors: Record<AccentColor, string> = {
  emerald: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40",
  blue: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40",
  violet: "bg-violet-600 hover:bg-violet-500 shadow-violet-900/40",
  orange: "bg-orange-600 hover:bg-orange-500 shadow-orange-900/40",
  sky: "bg-sky-600 hover:bg-sky-500 shadow-sky-900/40",
  rose: "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40",
  amber: "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40",
};

export default function DashboardPageHeader({
  section,
  title,
  subtitle,
  buttonLabel,
  onButtonClick,
  accent = "violet",
}: {
  section?: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onButtonClick: () => void;
  accent?: AccentColor;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        {section && (
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
            {section}
          </p>
        )}
        <h1
          className="text-3xl font-black text-white tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
      </div>
      <button
        onClick={onButtonClick}
        className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl active:scale-95 transition-all font-semibold shadow-lg text-sm ${buttonColors[accent]}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {buttonLabel}
      </button>
    </div>
  );
}
