"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import OptimizedImage from "@/components/common/OptimizedImage"

const FALLBACK_IMAGE = "/images/activity/melasti.png"
const AUTOPLAY_INTERVAL = 4000

// ── Props ───────────────────────────────────────────────────────────────

interface ImageGalleryProps {
  images: string[]
  title: string
  /** "banner" = 5-image grid (for page hero), "compact" = horizontal thumbnail strip */
  variant?: "banner" | "compact"
}

// ── Fullscreen Modal ────────────────────────────────────────────────────

function GalleryModal({
  images,
  initialIndex,
  onClose,
}: {
  images: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length])
  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length])

  // Autoplay
  useEffect(() => {
    autoplayRef.current = setInterval(next, AUTOPLAY_INTERVAL)
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current) }
  }, [next])

  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    autoplayRef.current = setInterval(next, AUTOPLAY_INTERVAL)
  }, [next])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") { next(); resetAutoplay() }
      if (e.key === "ArrowLeft") { prev(); resetAutoplay() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [next, prev, onClose, resetAutoplay])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white text-3xl font-light z-10 w-10 h-10 flex items-center justify-center"
          aria-label="Close gallery"
        >
          &times;
        </button>

        {/* Main image */}
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-black">
          <OptimizedImage
            src={images[index]}
            alt={`${index + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 896px"
            className="object-contain"
            priority
          />
        </div>

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => { prev(); resetAutoplay() }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white text-xl transition"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={() => { next(); resetAutoplay() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white text-xl transition"
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}

        {/* Counter */}
        <div className="mt-3 flex items-center justify-center">
          <span className="text-white/70 text-sm font-medium">
            {index + 1} / {images.length}
          </span>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="mt-2 flex justify-center gap-1.5 overflow-x-auto scrollbar-hide pb-2 px-4">
            {images.slice(0, 12).map((url, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); resetAutoplay() }}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  index === i ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <OptimizedImage src={url} alt={`Thumb ${i + 1}`} fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Banner Variant (5-image hero grid) ──────────────────────────────────

function BannerGallery({ images, title, onOpenModal }: {
  images: string[]
  title: string
  onOpenModal: (index: number) => void
}) {
  const img1 = images[0] || FALLBACK_IMAGE
  const img2 = images[1]
  const img3 = images[2]
  const img4 = images[3]
  const img5 = images[4]
  const extraCount = images.length - 5

  return (
    <div className="flex flex-col gap-3">
      {/* Grid: 1 large + 4 small */}
      <div className="flex flex-col sm:flex-row gap-1 rounded-2xl overflow-hidden">
        <button
          onClick={() => onOpenModal(0)}
          className="relative w-full sm:w-[55%] h-[280px] sm:h-[420px] cursor-pointer overflow-hidden group"
        >
          <OptimizedImage src={img1} alt={title} fill priority sizes="(max-width: 640px) 100vw, 55vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        </button>

        {img2 && (
          <div className="hidden sm:flex flex-col gap-1 w-[22.5%]">
            <button onClick={() => onOpenModal(1)} className="relative w-full h-[209px] cursor-pointer overflow-hidden group">
              <OptimizedImage src={img2} alt={`${title} 2`} fill sizes="22.5vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </button>
            {img3 && (
              <button onClick={() => onOpenModal(2)} className="relative w-full h-[209px] cursor-pointer overflow-hidden group">
                <OptimizedImage src={img3} alt={`${title} 3`} fill sizes="22.5vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </button>
            )}
          </div>
        )}

        {img4 && (
          <div className="hidden sm:flex flex-col gap-1 w-[22.5%]">
            <button onClick={() => onOpenModal(3)} className="relative w-full h-[209px] cursor-pointer overflow-hidden group">
              <OptimizedImage src={img4} alt={`${title} 4`} fill sizes="22.5vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </button>
            {img5 && (
              <button onClick={() => onOpenModal(4)} className="relative w-full h-[209px] cursor-pointer overflow-hidden group">
                <OptimizedImage src={img5} alt={`${title} 5`} fill sizes="22.5vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                {extraCount > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">+{extraCount} more</span>
                  </div>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile: horizontal scroll thumbnails */}
      {images.length > 1 && (
        <div className="flex sm:hidden gap-2 overflow-x-auto scrollbar-hide pb-1">
          {images.slice(0, 8).map((url, i) => (
            <button
              key={i}
              onClick={() => onOpenModal(i)}
              className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 border-transparent hover:border-[#0071CE] transition"
            >
              <OptimizedImage src={url} alt={`Thumbnail ${i + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Compact Variant (horizontal thumbnail strip) ────────────────────────

function CompactGallery({ images, onOpenModal }: {
  images: string[]
  onOpenModal: (index: number) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
      {images.slice(0, 5).map((url, i) => (
        <button
          key={i}
          onClick={() => onOpenModal(i)}
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-lg overflow-hidden shrink-0 border border-gray-200 hover:border-blue-400 transition cursor-pointer"
        >
          <OptimizedImage src={url} alt={`Gallery ${i + 1}`} fill sizes="72px" className="object-cover" />
          {i === 4 && images.length > 5 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-bold">+{images.length - 5}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────────────────

export default function ImageGallery({ images, title, variant = "banner" }: ImageGalleryProps) {
  const [modalIndex, setModalIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const openModal = (index: number) => setModalIndex(index)
  const closeModal = () => setModalIndex(null)

  return (
    <>
      {variant === "banner" ? (
        <BannerGallery images={images} title={title} onOpenModal={openModal} />
      ) : (
        <CompactGallery images={images} onOpenModal={openModal} />
      )}

      {modalIndex !== null && (
        <GalleryModal
          images={images}
          initialIndex={modalIndex}
          onClose={closeModal}
        />
      )}
    </>
  )
}
