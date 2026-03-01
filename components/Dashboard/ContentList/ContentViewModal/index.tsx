import { Content } from "@/utils/service/content.service";


export default function ContentViewModal({
    content, onClose, onEdit,
  }: {
    content: Content; onClose: () => void; onEdit: () => void;
  }) {
    const images = [content.image1, content.image2, content.image3, content.image4, content.image5].filter(Boolean) as string[];
    const fmtDate = (s: string) =>
      new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  
    return (
      <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 max-h-[90vh] overflow-y-auto">
        {/* Header image or gradient */}
        {content.imageMain ? (
          <div className="relative h-52 overflow-hidden">
            <img src={content.imageMain} alt={content.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-6 right-12">
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Content</p>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{content.title}</h2>
              {content.subTitle && <p className="text-slate-300 text-sm mt-0.5">{content.subTitle}</p>}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Content</p>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{content.title}</h2>
              {content.subTitle && <p className="text-orange-100 text-sm mt-0.5">{content.subTitle}</p>}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
  
        <div className="p-6 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Destinasi</p>
              <p className="text-blue-400 text-sm font-semibold truncate">{content.destination.title}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Tanggal</p>
              <p className="text-slate-300 text-xs">{fmtDate(content.dateAvailable)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${content.isAvailable ? "text-emerald-400" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${content.isAvailable ? "bg-emerald-400" : "bg-slate-500"}`} />
                {content.isAvailable ? "Tersedia" : "Nonaktif"}
              </span>
            </div>
          </div>
  
          {/* Description */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deskripsi</p>
            <p className="text-slate-300 text-sm leading-relaxed">{content.description}</p>
          </div>
  
          {/* Gallery */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Gallery ({images.length} gambar)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-700">
                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
  
        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors">
            Tutup
          </button>
          <button onClick={onEdit} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 text-sm font-semibold transition-colors">
            Edit Content
          </button>
        </div>
      </div>
    );
  }