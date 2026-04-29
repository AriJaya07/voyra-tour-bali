import Link from "next/link";

import OptimizedImage from "@/components/common/OptimizedImage";
import type { TourcmsListing } from "@/types/tourcms";

interface Props {
  item: TourcmsListing;
}

function formatPrice(item: TourcmsListing): string {
  if (!item.fromPrice) return "Price on request";
  return `${item.currencyCode || ""} ${item.fromPrice.toLocaleString()}`.trim();
}

export default function TourcmsCard({ item }: Props) {
  return (
    <Link
      href={`/tourcms/${item.slug}`}
      className="group block rounded-xl overflow-hidden bg-white border border-gray-200 hover:shadow-md transition"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        <OptimizedImage
          src={item.imageUrl ?? ""}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform"
        />
        <span className="absolute top-2 left-2 z-20 bg-[#02ACBE] text-white text-[10px] font-bold px-2 py-1 rounded">
          TourCMS
        </span>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm line-clamp-2 text-gray-800 group-hover:text-[#0071CE]">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{item.durationText || item.city || ""}</span>
          {item.rating ? <span>★ {item.rating.toFixed(1)}</span> : null}
        </div>
        <div className="text-sm font-bold text-[#0071CE]">
          {formatPrice(item)}
        </div>
      </div>
    </Link>
  );
}
