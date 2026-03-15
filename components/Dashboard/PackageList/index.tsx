import { useState } from "react";
import PackageTable from "@/components/Dashboard/PackageList/PackageTable";
import PackageForm from "@/components/Dashboard/PackageList/PackageForm";
import { usePackages } from "@/utils/hooks/usePackages";
import { Package, PackagePayload } from "@/utils/service/package.service";
import { ModalMode } from "@/components/common/InputForm";
import { PackageViewModal } from "@/components/Dashboard/PackageList/PackageViewModal";
import DashboardPageHeader from "@/components/Dashboard/common/DashboardPageHeader";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import StatsGrid from "@/components/Dashboard/common/StatsGrid";
import { LoadingState, ErrorBanner } from "@/components/Dashboard/common/LoadingState";
import { formatPrice } from "@/utils/formatPrice";

export default function PackageList() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Package | null>(null);

  const {
    data: packages,
    isLoading,
    isError,
    createPackage,
    updatePackage,
    deletePackage,
    creating,
    updating,
  } = usePackages();

  const openCreate = () => { setSelected(null); setModalMode("create"); };
  const openEdit = (p: Package) => { setSelected(p); setModalMode("edit"); };
  const openView = (p: Package) => { setSelected(p); setModalMode("view"); };
  const closeModal = () => { setModalMode(null); setSelected(null); };

  const handleCreate = (data: PackagePayload) => createPackage(data, { onSuccess: closeModal });
  const handleUpdate = (data: Partial<PackagePayload>) => {
    if (!selected) return;
    updatePackage({ id: selected.id, payload: data }, { onSuccess: closeModal });
  };
  const handleDelete = (id: number) => {
    if (confirm("Delete this package? This cannot be undone.")) deletePackage(id);
  };

  const totalRevenue = packages.reduce((s, p) => s + p.price, 0);
  const withCategory = packages.filter((p) => p.categoryId).length;
  const withDestination = packages.filter((p) => p.destinationId).length;

  const stats = [
    { label: "Total Packages", value: packages.length, color: "violet" as const },
    {
      label: "Total Value",
      value: formatPrice(totalRevenue),
      color: "emerald" as const,
    },
    { label: "With Category", value: withCategory, color: "blue" as const },
    { label: "With Destination", value: withDestination, color: "orange" as const },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <DashboardPageHeader
        section="Management"
        title="Packages"
        subtitle={`${packages.length} total package${packages.length !== 1 ? "s" : ""}`}
        buttonLabel="Add Package"
        onButtonClick={openCreate}
        accent="violet"
      />

      <StatsGrid stats={stats} isLoading={isLoading} />

      {isError && <ErrorBanner message="Failed to load packages. Please refresh." />}

      {isLoading ? (
        <LoadingState message="Loading packages..." accent="violet" />
      ) : (
        <PackageTable
          packages={packages}
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <DashboardModal open={modalMode !== null} onClose={closeModal}>
        {modalMode === "view" && selected ? (
          <PackageViewModal pkg={selected} onClose={closeModal} onEdit={() => setModalMode("edit")} />
        ) : (
          <PackageForm
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
