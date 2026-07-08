import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import type { GuideListItem } from "../types";

interface Props {
  guides: GuideListItem[];
}

export default function RelatedGuides({ guides }: Props) {
  if (guides.length === 0) return null;
  return (
    <section className="mt-12">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE] mb-1">Keep reading</p>
      <h2 className="text-xl font-black text-gray-900 mb-5">Related guides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {guides.slice(0, 3).map((g) => (
          <Link
            key={g.id}
            href={`/guides/${g.slug}`}
            className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[#0071CE]/40 hover:shadow-md transition"
          >
            <div className="relative h-36 bg-gray-100">
              {g.coverImage ? (
                <OptimizedImage
                  src={g.coverImage}
                  alt={g.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-2xl">
                  📖
                </div>
              )}
              <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/55 text-white text-[10px] font-bold rounded-full">
                {g.readingMinutes} min
              </span>
            </div>
            <div className="p-3">
              <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-[#0071CE] transition-colors">
                {g.title}
              </p>
              {g.region && <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{g.region}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
