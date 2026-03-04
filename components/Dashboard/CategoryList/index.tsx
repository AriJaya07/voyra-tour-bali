import { useState } from "react";
import CategoryTable from "@/components/Dashboard/CategoryList/CategoryTable";
import CategoryForm from "@/components/Dashboard/CategoryList/CategoryForm";
import { useCategories } from "@/utils/hooks/useCategories";
import { Category, CategoryPayload } from "@/utils/service/category.service";
import { CategoryViewModal } from "@/components/Dashboard/CategoryList/CategoryViewModal";
import { ModalMode } from "@/components/common/InputForm";
import DashboardPageHeader from "@/components/Dashboard/common/DashboardPageHeader";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import StatsGrid from "@/components/Dashboard/common/StatsGrid";
import { LoadingState, ErrorBanner } from "@/components/Dashboard/common/LoadingState";

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

    const handleCreate = (data: CategoryPayload) => createCategory(data, { onSuccess: closeModal });

    const handleUpdate = (data: Partial<CategoryPayload>) => {
      if (!selected) return;
      updateCategory({ id: selected.id, payload: data }, { onSuccess: closeModal });
    };

    const handleDelete = (id: number) => {
      if (confirm("Delete this category? This may affect linked destinations and packages.")) {
        deleteCategory(id);
      }
    };

    const stats = [
      { label: "Total Categories", value: categories.length, color: "emerald" as const },
      {
        label: "Linked Destinations",
        value: categories.reduce((s, c) => s + (c._count?.destinations ?? 0), 0),
        color: "blue" as const,
      },
      {
        label: "Linked Packages",
        value: categories.reduce((s, c) => s + (c._count?.packages ?? 0), 0),
        color: "violet" as const,
      },
    ];

    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DashboardPageHeader
          section="Manajemen"
          title="Categories"
          subtitle={`${categories.length} total categor${categories.length !== 1 ? "ies" : "y"}`}
          buttonLabel="Add Category"
          onButtonClick={openCreate}
          accent="emerald"
        />

        <StatsGrid stats={stats} isLoading={isLoading} columns={3} />

        {isError && <ErrorBanner message="Failed to load categories. Please refresh." />}

        {isLoading ? (
          <LoadingState message="Loading categories..." accent="emerald" />
        ) : (
          <CategoryTable
            categories={categories}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        <DashboardModal open={modalMode !== null} onClose={closeModal}>
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
        </DashboardModal>
      </div>
    );
}
