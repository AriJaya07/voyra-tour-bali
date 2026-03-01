"use client";

import EyesIcon from "@/components/assets/dashboard/EyesIcon";
import LinkPathIcon from "@/components/assets/dashboard/LinkPathIcon";
import LocationIcon from "@/components/assets/dashboard/LocationIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";
import TrashIcon from "@/components/assets/dashboard/TrashIcon";
import { ActionButton } from "@/components/common/InputForm";
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
          <LocationIcon />
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
                   <LinkPathIcon />
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
              <ActionButton
                onClick={() => onView(loc)}
                title="View"
                color="text-slate-500 hover:bg-slate-100"
                icon={
                  <EyesIcon />
                }
              />
              <ActionButton
                onClick={() => onEdit(loc)}
                title="Edit"
                color="text-blue-500 hover:bg-blue-50"
                icon={
                  <PencilIcon />
                }
              />
              <ActionButton
                onClick={() => onDelete(loc.id)}
                title="Delete"
                color="text-red-400 hover:bg-red-50"
                icon={
                  <TrashIcon />
                }
              />
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