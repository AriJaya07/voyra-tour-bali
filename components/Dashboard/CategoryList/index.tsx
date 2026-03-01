import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import CategoryTable from "@/components/Dashboard/CategoryList/CategoryTable";
import CategoryForm from "@/components/Dashboard/CategoryList/CategoryForm";
import { useCategories } from "@/utils/hooks/useCategories";
import { Category } from "@/utils/service/category.service";
import PlusIcon from "@/components/assets/dashboard/PlusIcon";
import { CategoryViewModal } from "@/components/Dashboard/CategoryList/CategoryViewModal";
import { ModalMode } from "@/components/common/InputForm";

export default function CategoryList() {
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
  
        <div className="flex-1 md:py-8 py-4 md:px-8 px-4">
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
              <PlusIcon />
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