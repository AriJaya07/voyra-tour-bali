"use client";

import { useEffect, useState } from "react";

interface Props {
  images: { url: string; alt?: string }[];
  startIndex: number;
  onClose: () => void;
}

export default function PublicLightbox({ images, startIndex, onClose }: Props) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!images.length) return null;
  const current = images[idx];

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${idx + 1} of ${images.length}`}
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        ✕
      </button>
      <div
        className="absolute left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        {idx + 1} / {images.length}
      </div>

      {idx > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => Math.max(0, i - 1));
          }}
          aria-label="Previous image"
          className="absolute left-3 sm:left-6 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl"
        >
          ‹
        </button>
      )}
      {idx < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => Math.min(images.length - 1, i + 1));
          }}
          aria-label="Next image"
          className="absolute right-3 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl"
        >
          ›
        </button>
      )}

      <div
        className="relative max-w-[95vw] max-h-[88vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.alt || ""}
          className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
