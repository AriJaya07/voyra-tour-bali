import { fmtDate } from "@/components/common/ListForm";
import { Location } from "@/utils/service/location.service";
import Link from "next/link";

// ── View Modal ─────────────────────────────────────────────
export default function LocationViewModal({
    location,
    onClose,
    onEdit,
  }: {
    location: Location;
    onClose: () => void;
    onEdit: () => void;
  }) {
    return (
      <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
        {/* Header with image */}
        {location.image ? (
          <div className="relative h-48 overflow-hidden">
            <img
              src={location.image}
              alt={location.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-4 left-6 right-12">
              <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-1">
                Lokasi
              </p>
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {location.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sky-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
                Lokasi
              </p>
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {location.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
  
        <div className="p-6 space-y-4">
          {/* Destination */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Destinasi
              </p>
              <p className="text-blue-400 text-sm font-semibold">
                {location.destination.title}
              </p>
            </div>
          </div>
  
          {/* Description */}
          {location.description && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deskripsi
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {location.description}
              </p>
            </div>
          )}
  
          {/* Link */}
          {location.hrefLink && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Link
              </p>
              <Link
                href={location.hrefLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors break-all"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {location.hrefLink}
              </Link>
            </div>
          )}
  
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-800/40 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                ID
              </p>
              <p className="text-slate-300 text-sm font-mono">#{location.id}</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Dibuat
              </p>
              <p className="text-slate-300 text-sm">{fmtDate(location.createdAt)}</p>
            </div>
          </div>
        </div>
  
        {/* Footer actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 text-sm font-semibold transition-colors"
          >
            Edit Lokasi
          </button>
        </div>
      </div>
    );
  }