import { ImageItem } from "@/utils/service/image.service";

export default function Lightbox({
    image,
    images,
    onClose,
    onNavigate,
    onLink,
    onDelete,
  }: {
    image: ImageItem;
    images: ImageItem[];
    onClose: () => void;
    onNavigate: (img: ImageItem) => void;
    onLink: () => void;
    onDelete: () => void;
  }) {
    const idx = images.findIndex((i) => i.id === image.id);
    const prev = idx > 0 ? images[idx - 1] : null;
    const next = idx < images.length - 1 ? images[idx + 1] : null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
  
        {/* Prev */}
        {prev && (
          <button
            onClick={() => onNavigate(prev)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
  
        {/* Next */}
        {next && (
          <button
            onClick={() => onNavigate(next)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
  
        {/* Main image + info */}
        <div className="flex flex-col lg:flex-row items-center gap-6 max-w-5xl w-full mx-16 px-4">
          <img
            src={image.url}
            alt=""
            className="max-h-[70vh] max-w-full lg:max-w-[65%] rounded-2xl object-contain shadow-2xl"
          />
  
          {/* Sidebar info */}
          <div className="lg:w-64 flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ID</p>
              <p className="text-white font-mono text-sm">#{image.id}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ditambahkan</p>
              <p className="text-white text-sm">{new Date(image.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Destinasi</p>
              {image.destination ? (
                <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                  📍 {image.destination.title}
                </span>
              ) : <p className="text-slate-600 text-xs">Tidak tertaut</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Package</p>
              {image.package ? (
                <span className="px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 text-xs font-medium border border-violet-500/20">
                  📦 {image.package.title}
                </span>
              ) : <p className="text-slate-600 text-xs">Tidak tertaut</p>}
            </div>
  
            <div className="pt-2 space-y-2">
              <button
                onClick={onLink}
                className="w-full py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-xs font-semibold transition-colors"
              >
                Tautkan ke Destinasi/Package
              </button>
              <button
                onClick={onDelete}
                className="w-full py-2 bg-slate-800 text-red-400 hover:bg-red-500/15 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors"
              >
                Hapus Gambar
              </button>
            </div>
  
            <p className="text-slate-700 text-xs text-center">
              {idx + 1} / {images.length}
            </p>
          </div>
        </div>
      </div>
    );
  }