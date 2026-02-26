"use client";

import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import CategoryTable from "@/components/Dashboard/CategoryTable";
import CategoryForm from "@/components/Dashboard/CategoryForm";
import { useCategories } from "@/utils/hooks/useCategories";
import { Category } from "@/utils/service/category.service";

type ModalMode = "create" | "edit" | "view" | null;

export default function DashboardCategoriesPage() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Category | null>(null);

  const {
    data: categories,
    isLoading,
    isError,
    createCategory,
    updateCategory,
    deleteCategory,
    creating,
    updating,
  } = useCategories();

  const openCreate = () => { setSelected(null); setModalMode("create"); };
  const openEdit = (c: Category) => { setSelected(c); setModalMode("edit"); };
  const openView = (c: Category) => { setSelected(c); setModalMode("view"); };
  const closeModal = () => { setModalMode(null); setSelected(null); };

  const handleCreate = (data: any) => createCategory(data, { onSuccess: closeModal });
  const handleUpdate = (data: any) => {
    if (!selected) return;
    updateCategory({ id: selected.id, payload: data }, { onSuccess: closeModal });
  };
  const handleDelete = (id: number) => {
    if (confirm("Delete this category? This may affect linked destinations and packages.")) {
      deleteCategory(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
            <p className="text-sm text-slate-500 mt-1">
              {categories.length} total categor{categories.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 transition-all font-medium shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Categories", value: categories.length, color: "emerald" },
            {
              label: "Linked Destinations",
              value: categories.reduce((s, c) => s + (c._count?.destinations ?? 0), 0),
              color: "blue",
            },
            {
              label: "Linked Packages",
              value: categories.reduce((s, c) => s + (c._count?.packages ?? 0), 0),
              color: "violet",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            Failed to load categories. Please refresh.
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="text-sm text-slate-400">Loading categories...</p>
          </div>
        ) : (
          <CategoryTable
            categories={categories}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg">
            {modalMode === "view" && selected ? (
              <CategoryViewModal category={selected} onClose={closeModal} onEdit={() => setModalMode("edit")} />
            ) : (
              <CategoryForm
                mode={modalMode === "edit" ? "edit" : "create"}
                initialData={selected ?? undefined}
                onSubmit={modalMode === "edit" ? handleUpdate : handleCreate}
                onCancel={closeModal}
                isLoading={creating || updating}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Modal ──────────────────────────────────────────────────────────────
function CategoryViewModal({
  category,
  onClose,
  onEdit,
}: {
  category: Category;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-0.5">Category</p>
          <h2 className="text-xl font-bold text-white">{category.name}</h2>
          <span className="mt-1 inline-block font-mono text-emerald-200 text-xs">/{category.slug}</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-4">
        {category.description && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-slate-700 text-sm leading-relaxed">{category.description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Destinations</p>
            <p className="text-2xl font-bold text-blue-600">{category._count?.destinations ?? 0}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Packages</p>
            <p className="text-2xl font-bold text-violet-600">{category._count?.packages ?? 0}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Created {new Date(category.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Close
        </button>
        <button onClick={onEdit} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}