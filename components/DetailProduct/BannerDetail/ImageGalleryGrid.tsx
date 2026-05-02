"use client";

import { useState } from "react";
import OptimizedImage from "@/components/common/OptimizedImage";
import PublicLightbox from "./PublicLightbox";

interface Props {
  images: { url: string }[];
  title: string;
  /** Right-content (e.g. WishlistButton) overlaid on first image */
  heroOverlay?: React.ReactNode;
}

export default function ImageGalleryGrid({ images, title, heroOverlay }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const lightboxImages = images.map((img) => ({ url: img.url, alt: title }));
  const img1 = images[0]?.url;
  const img2 = images[1]?.url;
  const img3 = images[2]?.url;
  const img4 = images[3]?.url;
  const img5 = images[4]?.url;

  const open = (idx: number) => () => setOpenIdx(idx);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-1">
        {/* Image 1 (always visible) */}
        <button
          type="button"
          onClick={open(0)}
          className="relative w-full sm:flex-[2] h-[458px] cursor-zoom-in group focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
          aria-label={`Open image 1 of ${images.length}`}
        >
          <OptimizedImage src={img1} alt={title} fill sizes="(max-width: 640px) 100vw, 733px" className="object-cover transition group-hover:opacity-95" priority />
          {heroOverlay && (
            <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
              {heroOverlay}
            </div>
          )}
          {images.length > 1 && (
            <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur-sm">
              View all {images.length} photos
            </span>
          )}
        </button>

        {/* Mobile: single secondary image */}
        <div className="flex flex-col sm:hidden gap-1">
          {img2 && (
            <button type="button" onClick={open(1)} className="relative w-full h-[226px] cursor-zoom-in" aria-label="Open image 2">
              <OptimizedImage src={img2} alt={title} fill sizes="100vw" className="object-cover" />
            </button>
          )}
        </div>

        {/* Larger screens: column of 2 */}
        <div className="hidden sm:flex sm:flex-col gap-1 sm:flex-1 h-[458px]">
          {img2 && (
            <button type="button" onClick={open(1)} className="relative w-full h-[229px] cursor-zoom-in" aria-label="Open image 2">
              <OptimizedImage src={img2} alt={title} fill sizes="362px" className="object-cover" />
            </button>
          )}
          {img3 && (
            <button type="button" onClick={open(2)} className="relative w-full h-[225px] cursor-zoom-in" aria-label="Open image 3">
              <OptimizedImage src={img3} alt={title} fill sizes="362px" className="object-cover" />
            </button>
          )}
        </div>

        {/* Larger screens: another column of 2 */}
        <div className="hidden sm:flex sm:flex-col gap-1 sm:flex-1 h-[458px]">
          {img4 && (
            <button type="button" onClick={open(3)} className="relative w-full h-[229px] cursor-zoom-in" aria-label="Open image 4">
              <OptimizedImage src={img4} alt={title} fill sizes="362px" className="object-cover" />
            </button>
          )}
          {img5 && (
            <button type="button" onClick={open(4)} className="relative w-full h-[225px] cursor-zoom-in group" aria-label={`Open image 5 (and ${images.length - 5} more)`}>
              <OptimizedImage src={img5} alt={title} fill sizes="362px" className="object-cover" />
              {images.length > 5 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">+{images.length - 5} more</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {openIdx !== null && (
        <PublicLightbox images={lightboxImages} startIndex={openIdx} onClose={() => setOpenIdx(null)} />
      )}
    </>
  );
}
