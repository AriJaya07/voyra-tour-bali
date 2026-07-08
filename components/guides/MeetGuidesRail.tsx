import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import type { TourGuideRailItem } from "./types";

interface Props {
  guides: TourGuideRailItem[];
}

export default function MeetGuidesRail({ guides }: Props) {
  if (guides.length === 0) return null;
  return (
    <section className="my-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">Real people</p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">Meet our local guides</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {guides.map((g) => (
          <Link
            key={g.id}
            href={`/guides/profiles/${g.slug}`}
            className="group bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#0071CE]/40 hover:shadow-md transition text-center"
          >
            {g.photo ? (
              <OptimizedImage
                src={g.photo}
                alt={g.name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-blue-50"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mx-auto mb-3 flex items-center justify-center text-2xl font-black text-[#0071CE]">
                {g.name.slice(0, 1)}
              </div>
            )}
            <p className="font-bold text-gray-900 text-sm leading-tight mb-1 group-hover:text-[#0071CE] transition-colors">
              {g.name}
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              {g.yearsActive}+ yrs · ★ {g.rating.toFixed(1)} ({g.reviewCount})
            </p>
            {g.languages.length > 0 && (
              <p className="text-[10px] text-gray-400 line-clamp-1">
                🗣 {g.languages.slice(0, 3).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
