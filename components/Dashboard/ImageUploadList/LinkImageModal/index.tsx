import { ImageItem } from "@/utils/service/image.service";
import { useState } from "react";

export default function LinkImageModal({
    image,
    destinations,
    packages,
    onSave,
    onClose,
  }: {
    image: ImageItem;
    destinations: { id: number; title: string }[];
    packages: { id: number; title: string }[];
    onSave: (destinationId: number | null, packageId: number | null) => void;
    onClose: () => void;
  }) {
    const [destId, setDestId] = useState<string>(image.destinationId ? String(image.destinationId) : "");
    const [pkgId, setPkgId] = useState<string>(image.packageId ? String(image.packageId) : "");
  
    const selectCls = "w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent";
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
  
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-pink-700 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-rose-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Media</p>
              <h2 className="text-white font-bold text-lg">Tautkan Gambar</h2>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
  
          <div className="p-6 space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <img src={image.url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="text-xs text-slate-400">
                <p className="font-mono text-slate-300 mb-0.5">Gambar #{image.id}</p>
                <p>Pilih destinasi atau package di bawah untuk menautkan gambar ini</p>
              </div>
            </div>
  
            {/* Destination select */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tautkan ke Destinasi
              </label>
              <select value={destId} onChange={(e) => { setDestId(e.target.value); if (e.target.value) setPkgId(""); }} className={selectCls}>
                <option value="">— Tidak ditautkan —</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
  
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs font-semibold">ATAU</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
  
            {/* Package select */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tautkan ke Package
              </label>
              <select value={pkgId} onChange={(e) => { setPkgId(e.target.value); if (e.target.value) setDestId(""); }} className={selectCls}>
                <option value="">— Tidak ditautkan —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
  
            {/* Remove links */}
            {(image.destinationId || image.packageId) && (
              <button
                onClick={() => onSave(null, null)}
                className="w-full py-2 text-amber-400 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors"
              >
                ✕ Lepas semua tautan
              </button>
            )}
  
            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors">
                Batal
              </button>
              <button
                onClick={() => onSave(destId ? Number(destId) : null, pkgId ? Number(pkgId) : null)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-sm font-semibold transition-colors"
              >
                Simpan Tautan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }