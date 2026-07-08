import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import type { GuideListItem } from "./types";

interface Props {
  guide: GuideListItem;
}

export default function GuideCardFeatured({ guide }: Props) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white rounded-3xl border border-gray-100 overflow-hidden hover:border-[#0071CE]/40 hover:shadow-lg transition shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative h-56 md:h-full md:min-h-[320px] bg-gray-100">
          {guide.coverImage ? (
            <OptimizedImage
              src={guide.coverImage}
              alt={guide.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-200 flex items-center justify-center text-5xl">
              ✨
            </div>
          )}
          <span className="absolute top-4 left-4 px-3 py-1 bg-amber-300 text-blue-900 text-[11px] font-black uppercase tracking-widest rounded-full shadow">
            Featured
          </span>
          {guide.region && (
            <span className="absolute bottom-4 left-4 px-2.5 py-1 bg-white/95 text-[11px] font-bold uppercase tracking-wider text-gray-700 rounded-full">
              {guide.region}
            </span>
          )}
        </div>
        <div className="p-6 sm:p-8 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE] mb-2">
            Editor&apos;s pick
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-3 group-hover:text-[#0071CE] transition-colors">
            {guide.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5 line-clamp-4">{guide.excerpt}</p>
          <div className="mt-auto flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">
              {guide.readingMinutes} min read · {guide.views.toLocaleString()} views
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071CE] text-white text-xs font-bold rounded-xl group-hover:bg-[#005ba6] transition">
              Read guide →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
