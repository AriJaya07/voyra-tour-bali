import type { AccentColor } from "./DashboardPageHeader";

const spinnerColors: Record<AccentColor, string> = {
  emerald: "border-emerald-500",
  blue: "border-blue-500",
  violet: "border-violet-500",
  orange: "border-orange-500",
  sky: "border-sky-500",
  rose: "border-rose-500",
  amber: "border-amber-500",
};

export function LoadingState({
  message = "Loading...",
  accent = "violet",
}: {
  message?: string;
  accent?: AccentColor;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${spinnerColors[accent]}`} />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl px-4 py-3 text-sm">
      {message}
    </div>
  );
}
