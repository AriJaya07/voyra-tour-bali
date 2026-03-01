"use client";

import { Content } from "@/utils/service/content.service";

interface Props {
  contents: Content[];
  onView: (c: Content) => void;
  onEdit: (c: Content) => void;
  onDelete: (id: number) => void;
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

const GRADIENTS = [
  "from-orange-500 to-amber-600",
  "from-rose-500 to-orange-600",
  "from-amber-500 to-yellow-600",
  "from-red-500 to-rose-600",
  "from-yellow-500 to-orange-500",
];

export default function ContentTable({ contents, onView, onEdit, onDelete }: Props) {
  if (contents.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-400 font-semibold">Belum ada content</p>
        <p className="text-slate-600 text-sm mt-1">Klik "Tambah Content" untuk memulai</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Head */}
      <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-800/60 border-b border-slate-800">
        {["", "Content", "Destinasi", "Tanggal", "Status", "Images", "Aksi"].map((h) => (
          <p key={h} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {contents.map((c, i) => (
          <div
            key={c.id}
            className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-4 items-center hover:bg-slate-800/30 transition-colors group"
          >
            {/* Thumbnail / Avatar */}
            <div className="flex-shrink-0">
              {c.imageMain ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={c.imageMain}
                    alt={c.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-xs font-bold">{c.title.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="min-w-0">
              <p className="text-slate-200 text-sm font-semibold truncate">{c.title}</p>
              {c.subTitle && (
                <p className="text-slate-500 text-xs truncate mt-0.5">{c.subTitle}</p>
              )}
            </div>

            {/* Destination */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium w-fit truncate max-w-[130px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {c.destination.title}
            </span>

            {/* Date */}
            <p className="text-slate-500 text-xs">{fmtDate(c.dateAvailable)}</p>

            {/* Status */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
              c.isAvailable
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-slate-700/50 text-slate-500 border border-slate-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.isAvailable ? "bg-emerald-400" : "bg-slate-500"}`} />
              {c.isAvailable ? "Tersedia" : "Nonaktif"}
            </span>

            {/* Image count */}
            <div className="flex items-center gap-1">
              {[c.image1, c.image2, c.image3, c.image4, c.image5]
                .filter(Boolean)
                .slice(0, 3)
                .map((url, idx) => (
                  <div key={idx} className="w-6 h-6 rounded-md overflow-hidden border border-slate-700">
                    <img src={url!} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                ))}
              {[c.image1, c.image2, c.image3, c.image4, c.image5].filter(Boolean).length > 3 && (
                <span className="text-slate-500 text-xs">+{[c.image1, c.image2, c.image3, c.image4, c.image5].filter(Boolean).length - 3}</span>
              )}
              {![c.image1, c.image2, c.image3, c.image4, c.image5].some(Boolean) && (
                <span className="text-slate-700 text-xs">—</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn onClick={() => onView(c)} title="Lihat" cls="text-slate-500 hover:bg-slate-700 hover:text-white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </IconBtn>
              <IconBtn onClick={() => onEdit(c)} title="Edit" cls="text-orange-500 hover:bg-orange-500/15">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </IconBtn>
              <IconBtn onClick={() => onDelete(c.id)} title="Hapus" cls="text-red-400 hover:bg-red-500/15">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-800">
        <p className="text-xs text-slate-600">
          Menampilkan <span className="font-semibold text-slate-400">{contents.length}</span> content
        </p>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, cls, children }: {
  onClick: () => void; title: string; cls: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${cls}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{children}</svg>
    </button>
  );
}