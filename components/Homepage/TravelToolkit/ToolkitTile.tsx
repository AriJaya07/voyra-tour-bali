import Link from "next/link";

export type ToolkitAccent = "sky" | "violet" | "pink" | "emerald" | "amber" | "blue";

interface Props {
  href: string;
  title: string;
  description: string;
  badge?: string | number | null;
  badgeTone?: "default" | "alert" | "success";
  icon: React.ReactNode;
  accent: ToolkitAccent;
  ariaLabel?: string;
  className?: string;
}

const ACCENT: Record<ToolkitAccent, { bg: string; ring: string; iconBg: string; text: string }> = {
  sky: {
    bg: "from-sky-50 to-white",
    ring: "hover:ring-sky-200",
    iconBg: "bg-sky-100 text-sky-600",
    text: "text-sky-700",
  },
  violet: {
    bg: "from-violet-50 to-white",
    ring: "hover:ring-violet-200",
    iconBg: "bg-violet-100 text-violet-600",
    text: "text-violet-700",
  },
  pink: {
    bg: "from-pink-50 to-white",
    ring: "hover:ring-pink-200",
    iconBg: "bg-pink-100 text-pink-600",
    text: "text-pink-700",
  },
  emerald: {
    bg: "from-emerald-50 to-white",
    ring: "hover:ring-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-700",
  },
  amber: {
    bg: "from-amber-50 to-white",
    ring: "hover:ring-amber-200",
    iconBg: "bg-amber-100 text-amber-600",
    text: "text-amber-700",
  },
  blue: {
    bg: "from-blue-50 to-white",
    ring: "hover:ring-blue-200",
    iconBg: "bg-blue-100 text-blue-600",
    text: "text-blue-700",
  },
};

const BADGE_TONE: Record<NonNullable<Props["badgeTone"]>, string> = {
  default: "bg-gray-900 text-white",
  alert: "bg-red-500 text-white",
  success: "bg-emerald-500 text-white",
};

export default function ToolkitTile({
  href,
  title,
  description,
  badge,
  badgeTone = "default",
  icon,
  accent,
  ariaLabel,
  className = "",
}: Props) {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      aria-label={ariaLabel || `${title}. ${description}`}
      data-toolkit-tile={title}
      className={`group relative block bg-gradient-to-br ${a.bg} rounded-2xl border border-gray-100 p-4 sm:p-5 transition hover:-translate-y-0.5 hover:shadow-lg ring-1 ring-transparent ${a.ring} focus:outline-none focus:ring-2 focus:ring-[#0071CE] motion-reduce:hover:translate-y-0 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${a.iconBg}`}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">{title}</h3>
            {badge !== undefined && badge !== null && badge !== "" && (
              <span
                className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full ${BADGE_TONE[badgeTone]}`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
            {description}
          </p>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold mt-2 ${a.text} group-hover:gap-1.5 transition-all`}
          >
            Open
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
