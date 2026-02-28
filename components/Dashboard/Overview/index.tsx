import Link from "next/link";

export function KpiCard({
        label, value, isLoading, icon, color, href, sub,
    }: {
        label: string;
        value?: number;
        isLoading: boolean;
        icon: string;
        color: string;
        href: string;
        sub: string;
    }) {
    return (
        <Link href={href} className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all hover:scale-[1.02] block">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
            <span className="text-lg">{icon}</span>
        </div>
        {isLoading ? (
            <div className="h-8 w-16 bg-slate-800 rounded-lg animate-pulse mb-2" />
        ) : (
            <p className="text-3xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            {value ?? 0}
            </p>
        )}
        <p className="text-slate-400 text-sm font-semibold">{label}</p>
        <p className="text-slate-600 text-xs mt-0.5 group-hover:text-slate-400 transition-colors">{sub} →</p>
        </Link>
    );
}

export function ValueCard({
        label, value, sub, isLoading, accent,
    }: {
        label: string;
        value: string | null;
        sub: string;
        isLoading: boolean;
        accent: "violet" | "amber" | "blue";
    }) {
    const colors = {
        violet: "border-violet-500/20 bg-violet-500/5",
        amber: "border-amber-500/20 bg-amber-500/5",
        blue: "border-blue-500/20 bg-blue-500/5",
    };
    const textColors = {
        violet: "text-violet-300",
        amber: "text-amber-300",
        blue: "text-blue-300",
    };

    return (
        <div className={`rounded-2xl border p-5 ${colors[accent]}`}>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
        {isLoading ? (
            <div className="h-7 w-28 bg-slate-800 rounded-lg animate-pulse mb-2" />
        ) : (
            <p className={`text-2xl font-black ${textColors[accent]}`} style={{ fontFamily: "'Syne', sans-serif" }}>
            {value}
            </p>
        )}
        <p className="text-slate-600 text-xs mt-1">{sub}</p>
        </div>
    );
}

export const COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#06b6d4"];

export function CategoryBar({
        cat,
        index,
    }: {
        cat: { name: string; packages: number; destinations: number };
        index: number;
    }) {
    const total = cat.packages + cat.destinations;
    const maxPossible = 20; // relative bar width
    const pct = Math.min((total / maxPossible) * 100, 100);
    const color = COLORS[index % COLORS.length];

    return (
        <div>
        <div className="flex items-center justify-between mb-1">
            <span className="text-slate-300 text-xs font-semibold truncate max-w-[120px]">{cat.name}</span>
            <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500">
            <span>{cat.packages} pkg</span>
            <span>{cat.destinations} dest</span>
            </div>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
            />
        </div>
        </div>
    );
}

export function BarChart({
        labels,
        packages,
        destinations,
    }: {
        labels: string[];
        packages: number[];
        destinations: number[];
    }) {
    const max = Math.max(...packages, ...destinations, 1);

    return (
        <div className="flex items-end gap-2 h-48">
        {labels.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-36">
                {/* Packages bar */}
                <div
                className="flex-1 rounded-t-md bg-violet-500/70 hover:bg-violet-500 transition-all"
                style={{ height: `${(packages[i] / max) * 100}%`, minHeight: packages[i] > 0 ? "4px" : "0" }}
                title={`Packages: ${packages[i]}`}
                />
                {/* Destinations bar */}
                <div
                className="flex-1 rounded-t-md bg-sky-500/70 hover:bg-sky-500 transition-all"
                style={{ height: `${(destinations[i] / max) * 100}%`, minHeight: destinations[i] > 0 ? "4px" : "0" }}
                title={`Destinations: ${destinations[i]}`}
                />
            </div>
            <span className="text-slate-600 text-xs text-center leading-tight">{label}</span>
            </div>
        ))}
        </div>
    );
}

export function Spinner({ color }: { color: string }) {
    const colors: Record<string, string> = {
        violet: "border-violet-500",
        blue: "border-blue-500",
        emerald: "border-emerald-500",
        amber: "border-amber-500",
    };
    return (
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${colors[color] ?? "border-slate-500"}`} />
    );
}

export function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-slate-600 text-sm">{label}</p>
        </div>
    );
}