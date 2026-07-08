"use client";

import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useRecentlyViewedStore } from "@/utils/hooks/useRecentlyViewed";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { formatPrice, type CurrencyCode, isCurrencyCode } from "@/utils/formatPrice";
import WishlistButton from "@/components/common/WishlistButton";

interface Props {
  /** Hide entirely if fewer than N items recorded. Default: 1 */
  minItems?: number;
  /** Limit shown */
  limit?: number;
  /** Optional excluded productCode to skip (e.g. on detail page, hide current tour) */
  excludeProductCode?: string;
  className?: string;
  title?: string;
}

export default function RecentlyViewedStrip({
  minItems = 1,
  limit = 12,
  excludeProductCode,
  className = "",
  title = "Recently Viewed",
}: Props) {
  const { items, hydrated } = useRecentlyViewedStore();
  const { currency, exchangeRates } = useCurrency();

  if (!hydrated) return null;
  const filtered = excludeProductCode
    ? items.filter((i) => i.productCode !== excludeProductCode)
    : items;
  const displayed = filtered.slice(0, limit);
  if (displayed.length < minItems) return null;

  return (
    <section className={`py-6 ${className}`} aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{displayed.length} item{displayed.length === 1 ? "" : "s"}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {displayed.map((item) => {
          const sourceCurrency = isCurrencyCode(item.currency) ? (item.currency as CurrencyCode) : undefined;
          const card = (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition group h-full">
              <div className="relative aspect-[4/3] bg-gray-100">
                {item.imageUrl ? (
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100" />
                )}
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <WishlistButton
                    size="sm"
                    item={{
                      productCode: item.productCode,
                      source: item.source,
                      title: item.title,
                      imageUrl: item.imageUrl,
                      price: item.price,
                      currency: item.currency,
                      href: item.href,
                    }}
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[40px]">{item.title}</p>
                {item.price && item.price > 0 && (
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {formatPrice(item.price, currency, sourceCurrency, exchangeRates)}
                  </p>
                )}
              </div>
            </div>
          );

          const wrapperCls = "min-w-[180px] w-[180px] sm:min-w-[210px] sm:w-[210px] snap-start";

          if (item.href?.startsWith("http")) {
            return (
              <a
                key={`${item.source}::${item.productCode}`}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={wrapperCls}
              >
                {card}
              </a>
            );
          }
          return (
            <Link
              key={`${item.source}::${item.productCode}`}
              href={item.href || "#"}
              className={wrapperCls}
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
