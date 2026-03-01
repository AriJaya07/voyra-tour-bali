"use client";

import { Location } from "@/utils/service/location.service";
import Link from "next/link";

interface Props {
  locations: Location[];
  onView: (l: Location) => void;
  onEdit: (l: Location) => void;
  onDelete: (id: number) => void;
}

const GRADIENTS = [
  "from-sky-500 to-cyan-600",
  "from-teal-500 to-emerald-600",
  "from-blue-500 to-indigo-600",
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
];

export default function LocationTable({ locations, onView, onEdit, onDelete }: Props) {
  if (locations.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-sky-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-slate-400 font-semibold">Belum ada lokasi</p>
        <p className="text-slate-600 text-sm mt-1">
          Klik "Tambah Lokasi" untuk memulai
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Head */}
      <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-800/60 border-b border-slate-800">
        {["", "Lokasi", "Destinasi", "Link", "Deskripsi", "Aksi"].map((h) => (
          <p
            key={h}
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            {h}
          </p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {locations.map((loc, i) => (
          <div
            key={loc.id}
            className="grid grid-cols-[auto_2fr_1.5fr_1fr_1.5fr_auto] gap-3 px-5 py-4 items-center hover:bg-slate-800/30 transition-colors group"
          >
            {/* Avatar / Thumbnail */}
            <div className="flex-shrink-0">
              {loc.image ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={loc.image}
                    alt={loc.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.classList.add(
                        "bg-gradient-to-br",
                        GRADIENTS[i % GRADIENTS.length].split(" ")[0],
                        GRADIENTS[i % GRADIENTS.length].split(" ")[1]
                      );
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center shadow-sm`}
                >
                  <span className="text-white text-xs font-bold">
                    {loc.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="min-w-0">
              <p className="text-slate-200 text-sm font-semibold truncate">
                {loc.title}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">ID #{loc.id}</p>
            </div>

            {/* Destination */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium w-fit truncate max-w-[140px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {loc.destination.title}
            </span>

            {/* HrefLink */}
            {loc.hrefLink ? (
                <Link 
                    href={loc.hrefLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors truncate max-w-[120px]"
                >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka Link
                </Link>
            ) : (
              <span className="text-slate-700 text-xs">—</span>
            )}

            {/* Description */}
            <p className="text-slate-500 text-xs truncate">
              {loc.description ?? "—"}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn
                onClick={() => onView(loc)}
                title="Lihat"
                cls="text-slate-500 hover:bg-slate-700 hover:text-white"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </IconBtn>
              <IconBtn
                onClick={() => onEdit(loc)}
                title="Edit"
                cls="text-sky-500 hover:bg-sky-500/15"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </IconBtn>
              <IconBtn
                onClick={() => onDelete(loc.id)}
                title="Hapus"
                cls="text-red-400 hover:bg-red-500/15"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-800">
        <p className="text-xs text-slate-600">
          Menampilkan{" "}
          <span className="font-semibold text-slate-400">{locations.length}</span>{" "}
          lokasi
        </p>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  cls,
  children,
}: {
  onClick: () => void;
  title: string;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${cls}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {children}
      </svg>
    </button>
  );
}