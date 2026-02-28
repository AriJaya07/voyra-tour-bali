"use client";

import EyesIcon from "@/components/assets/dashboard/EyesIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";
import TagIcon from "@/components/assets/dashboard/TagIcon";
import TrashIcon from "@/components/assets/dashboard/TrashIcon";
import { ActionButton } from "@/components/common/InputForm";
import { Category } from "@/utils/service/category.service";

interface Props {
  categories: Category[];
  onView: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (id: number) => void;
}

export default function CategoryTable({ categories, onView, onEdit, onDelete }: Props) {
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <TagIcon />
        </div>
        <p className="text-slate-600 font-semibold">No categories yet</p>
        <p className="text-slate-400 text-sm mt-1">Click "Add Category" to get started.</p>
      </div>
    );
  }

  const COLORS = [
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-violet-400 to-purple-500",
    "from-orange-400 to-rose-500",
    "from-pink-400 to-fuchsia-500",
    "from-amber-400 to-yellow-500",
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Head */}
      <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
        {["", "Name", "Slug", "Destinations", "Packages", "Actions"].map((h) => (
          <p key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors group"
          >
            {/* Color avatar */}
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center shadow-sm`}>
              <span className="text-white text-xs font-bold">{cat.name.charAt(0).toUpperCase()}</span>
            </div>

            {/* Name + description */}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{cat.description}</p>
              )}
            </div>

            {/* Slug */}
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate">
              /{cat.slug}
            </span>

            {/* Counts */}
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-semibold">
                {cat._count?.destinations ?? 0}
              </span>
              <span className="text-xs text-slate-400">dest.</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs flex items-center justify-center font-semibold">
                {cat._count?.packages ?? 0}
              </span>
              <span className="text-xs text-slate-400">pkg.</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton
                onClick={() => onView(cat)}
                title="View"
                color="text-slate-500 hover:bg-slate-100"
                icon={
                  <EyesIcon />
                }
              />
              <ActionButton
                onClick={() => onEdit(cat)}
                title="Edit"
                color="text-emerald-500 hover:bg-emerald-50"
                icon={
                  <PencilIcon />
                }
              />
              <ActionButton
                onClick={() => onDelete(cat.id)}
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

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{categories.length}</span> categor{categories.length !== 1 ? "ies" : "y"}
        </p>
      </div>
    </div>
  );
}