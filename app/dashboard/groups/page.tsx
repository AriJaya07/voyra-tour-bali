"use client";

import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import PackageTable from "@/components/Dashboard/PackageList/PackageTable";
import PackageForm from "@/components/Dashboard/PackageList/PackageForm";
import { usePackages } from "@/utils/hooks/usePackages";
import { Package } from "@/utils/service/package.service";
import PlusIcon from "@/components/assets/dashboard/PlusIcon";
import { ModalMode } from "@/components/common/InputForm";
import { PackageViewModal } from "@/components/Dashboard/PackageList/ModalDetail";


export default function DashboardPackagesPage() {
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

  const handleCreate = (data: any) => createPackage(data, { onSuccess: closeModal });
  const handleUpdate = (data: any) => {
    if (!selected) return;
    updatePackage({ id: selected.id, payload: data }, { onSuccess: closeModal });
  };
  const handleDelete = (id: number) => {
    if (confirm("Delete this package? This cannot be undone.")) deletePackage(id);
  };

  // Stats
  const totalRevenue = packages.reduce((s, p) => s + p.price, 0);
  const withCategory = packages.filter((p) => p.categoryId).length;
  const withDestination = packages.filter((p) => p.destinationId).length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 md:py-8 py-4 md:px-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Packages</h1>
            <p className="text-sm text-slate-500 mt-1">
              {packages.length} total package{packages.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 active:scale-95 transition-all font-medium shadow-sm text-sm"
          >
            <PlusIcon />
            Add Package
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Packages", value: packages.length, color: "violet", suffix: "" },
            {
              label: "Total Value",
              value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
              color: "emerald",
              suffix: "",
            },
            { label: "With Category", value: withCategory, color: "blue", suffix: "" },
            { label: "With Destination", value: withDestination, color: "orange", suffix: "" },
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
            Failed to load packages. Please refresh.
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            <p className="text-sm text-slate-400">Loading packages...</p>
          </div>
        ) : (
          <PackageTable
            packages={packages}
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
          </div>
        </div>
      )}
    </div>
  );
}