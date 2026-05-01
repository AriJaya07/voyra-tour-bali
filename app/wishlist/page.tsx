"use client";

import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useWishlistStore } from "@/utils/hooks/useWishlist";
import WishlistButton from "@/components/common/WishlistButton";
import RecentlyViewedStrip from "@/components/common/RecentlyViewedStrip";

export default function WishlistPage() {
  const { items, hydrated } = useWishlistStore();

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            {items.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{items.length} saved tour{items.length === 1 ? "" : "s"}</p>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <>
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">No saved tours yet</p>
              <p className="text-sm text-gray-500 mb-6">Tap the heart on any tour to save it for later.</p>
              <Link href="/" className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-xl text-sm hover:bg-[#005ba6] transition shadow-sm">
                Browse Tours
              </Link>
            </div>
            <RecentlyViewedStrip className="mt-4" minItems={1} title="Pick up where you left off" />
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const savedDays = item.savedAt
                ? Math.max(0, Math.floor((Date.now() - new Date(item.savedAt).getTime()) / (24 * 3600 * 1000)))
                : null;
              const savedLabel =
                savedDays === null
                  ? null
                  : savedDays === 0
                    ? "Saved today"
                    : savedDays === 1
                      ? "Saved yesterday"
                      : `Saved ${savedDays}d ago`;

              const card = (
                <div className="relative w-full h-[220px] rounded-md overflow-hidden group">
                  {item.imageUrl ? (
                    <OptimizedImage
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100" />
                  )}
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <WishlistButton size="sm" item={item} />
                  </div>
                  {savedLabel && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/95 text-[10px] font-bold text-gray-600 rounded-full shadow-sm">
                      {savedLabel}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pointer-events-none">
                    <p className="text-white font-bold text-sm leading-tight line-clamp-2">{item.title}</p>
                  </div>
                </div>
              );

              const key = `${item.source}::${item.productCode}`;

              if (item.href?.startsWith("http")) {
                return (
                  <a key={key} href={item.href} target="_blank" rel="noopener noreferrer sponsored" className="block">
                    {card}
                  </a>
                );
              }
              if (item.href) {
                return (
                  <Link key={key} href={item.href} className="block">
                    {card}
                  </Link>
                );
              }
              return <div key={key}>{card}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
