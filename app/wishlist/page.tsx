"use client";

import Link from "next/link";
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Wishlist</h1>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={`${item.source}::${item.productCode}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition group">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100" />
                  )}
                  <div className="absolute top-2 right-2">
                    <WishlistButton size="sm" item={item} />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 min-h-[40px]">{item.title}</h3>
                  {item.price && item.price > 0 && (
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      {item.currency || "USD"} {item.price.toLocaleString()}
                    </p>
                  )}
                  {item.href ? (
                    item.href.startsWith("http") ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="block w-full text-center px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition"
                      >
                        View Tour
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="block w-full text-center px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition"
                      >
                        View Tour
                      </Link>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
