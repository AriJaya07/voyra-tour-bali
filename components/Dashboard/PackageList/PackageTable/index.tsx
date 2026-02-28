"use client";

import EyesIcon from "@/components/assets/dashboard/EyesIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";
import TrashIcon from "@/components/assets/dashboard/TrashIcon";
import { ActionButton } from "@/components/common/InputForm";
import { Package } from "@/utils/service/package.service";

interface Props {
  packages: Package[];
  onView: (p: Package) => void;
  onEdit: (p: Package) => void;
  onDelete: (id: number) => void;
}

const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-emerald-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
];

export default function PackageTable({ packages, onView, onEdit, onDelete }: Props) {
  if (packages.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-slate-600 font-semibold">No packages yet</p>
        <p className="text-slate-400 text-sm mt-1">Click "Add Package" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
        {["", "Title", "Description", "Price", "Category", "Destination", "Actions"].map((h) => (
          <p key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</p>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {packages.map((pkg, i) => (
          <div key={pkg.id} className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-4 items-center hover:bg-slate-50 transition-colors group">
            
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{pkg.title}</p>
              {pkg._count && (
                <p className="text-xs text-slate-400 mt-0.5">{pkg._count.images} image{pkg._count.images !== 1 ? "s" : ""}</p>
              )}
            </div>

            <p className="text-slate-500 text-sm truncate">{pkg.description}</p>

            <span className="text-sm font-bold text-slate-800">
              ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>

            {pkg.category ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium w-fit truncate max-w-[120px]">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                {pkg.category.name}
              </span>
            ) : (
              <span className="text-slate-300 text-xs">—</span>
            )}

            {pkg.destination ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium w-fit truncate max-w-[120px]">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                {pkg.destination.title}
              </span>
            ) : (
              <span className="text-slate-300 text-xs">—</span>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton
                onClick={() => onView(pkg)}
                title="View"
                color="text-slate-500 hover:bg-slate-100"
                icon={
                  <EyesIcon />
                }
              />
              <ActionButton
                onClick={() => onEdit(pkg)}
                title="Edit"
                color="text-violet-500 hover:bg-violet-50"
                icon={
                  <PencilIcon />
                }
              />
              <ActionButton
                onClick={() => onDelete(pkg.id)}
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
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{packages.length}</span> package{packages.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}