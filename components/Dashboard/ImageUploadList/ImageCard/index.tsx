import { ImageItem } from "@/utils/service/image.service";

export default function ImageCard({
    image,
    onView,
    onLink,
    onDelete,
  }: {
    image: ImageItem;
    onView: () => void;
    onLink: () => void;
    onDelete: () => void;
  }) {
    return (
      <div className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-800 cursor-pointer">
        <img
          src={image.url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onClick={onView}
          loading="lazy"
        />
  
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  
        {/* Link badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {image.destination && (
            <span className="px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-semibold backdrop-blur-sm truncate max-w-[90px]">
              📍 {image.destination.title}
            </span>
          )}
          {image.package && (
            <span className="px-1.5 py-0.5 rounded-md bg-violet-600/90 text-white text-[10px] font-semibold backdrop-blur-sm truncate max-w-[90px]">
              📦 {image.package.title}
            </span>
          )}
          {!image.destination && !image.package && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-600/80 text-white text-[10px] font-semibold backdrop-blur-sm">
              Bebas
            </span>
          )}
        </div>
  
        {/* Action buttons */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onLink(); }}
            className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            title="Tautkan"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded-lg bg-red-500/70 backdrop-blur-sm hover:bg-red-500 flex items-center justify-center text-white transition-colors"
            title="Hapus"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }