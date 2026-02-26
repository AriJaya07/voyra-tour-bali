"use client";

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
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
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

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn onClick={() => onView(cat)} title="View" cls="text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </IconBtn>
              <IconBtn onClick={() => onEdit(cat)} title="Edit" cls="text-emerald-500 hover:bg-emerald-50">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </IconBtn>
              <IconBtn onClick={() => onDelete(cat.id)} title="Delete" cls="text-red-400 hover:bg-red-50">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{categories.length}</span> categor{categories.length !== 1 ? "ies" : "y"}
        </p>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, cls, children }: {
  onClick: () => void;
  title: string;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${cls}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{children}</svg>
    </button>
  );
}