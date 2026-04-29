"use client";

import OptimizedImage from "@/components/common/OptimizedImage";
import type { TourcmsProductDetail } from "@/types/tourcms";
import TourcmsBookingWidget from "./TourcmsBookingWidget";

interface Props {
  product: TourcmsProductDetail;
}

export default function TourcmsProductClient({ product }: Props) {
  const hero = product.images[0]?.url || product.imageUrl;
  const gallery = product.images.slice(1, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-8">
      <div className="lg:col-span-2 space-y-6">
        {hero && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
            <OptimizedImage
              src={hero}
              alt={product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        {gallery.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {gallery.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <OptimizedImage
                  src={img.url}
                  alt={img.alt || `${product.title} photo ${i + 2}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <span className="inline-block bg-[#02ACBE] text-white text-[10px] font-bold px-2 py-1 rounded">
            TourCMS
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">{product.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            {product.durationText && <span>{product.durationText}</span>}
            {product.city && <span>· {product.city}</span>}
            {product.rating ? (
              <span>· ★ {product.rating.toFixed(1)} ({product.reviewCount ?? 0})</span>
            ) : null}
          </div>
        </div>

        {product.description && (
          <section>
            <h2 className="font-bold text-lg mb-2">Overview</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-6">
              {product.description}
            </p>
          </section>
        )}

        {product.highlights.length > 0 && (
          <section>
            <h2 className="font-bold text-lg mb-2">Highlights</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {product.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        {(product.inclusions.length > 0 || product.exclusions.length > 0) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {product.inclusions.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Included</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {product.inclusions.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {product.exclusions.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Not included</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {product.exclusions.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {product.meetingPoint && (
          <section>
            <h2 className="font-bold text-lg mb-2">Meeting point</h2>
            <p className="text-sm text-gray-700">{product.meetingPoint}</p>
          </section>
        )}
      </div>

      <aside className="lg:col-span-1">
        <TourcmsBookingWidget product={product} />
      </aside>
    </div>
  );
}
