import Link from "next/link";
import type { GuideListItem } from "./types";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

interface Props {
  guide: GuideListItem;
  reasonLabel?: string;
}

export default function GuideCard({ guide, reasonLabel }: Props) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[#0071CE]/40 hover:shadow-md transition"
    >
      <div className="relative h-44 bg-gray-100">
        {guide.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.coverImage}
            alt={guide.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-3xl">
            📖
          </div>
        )}
        {guide.region && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 text-[10px] font-bold uppercase tracking-wider text-gray-700 rounded-full">
            {guide.region}
          </span>
        )}
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/55 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
          {guide.readingMinutes} min
        </span>
        {reasonLabel && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-amber-300 text-blue-900 text-[10px] font-black uppercase tracking-wider rounded-full">
            ✨ {reasonLabel}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{guide.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-3 flex-1">{guide.excerpt}</p>
        {guide.tags.length > 0 && (
          <div className="mt-auto mb-2 flex flex-wrap gap-1">
            {guide.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400">
          {fmtDate(guide.publishedAt)} · {guide.views.toLocaleString()} views
        </p>
      </div>
    </Link>
  );
}
