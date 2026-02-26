"use client";

import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import PackageTable from "@/components/Dashboard/PackageTable";
import PackageForm from "@/components/Dashboard/PackageForm";
import { usePackages } from "@/utils/hooks/usePackages";
import { Package } from "@/utils/service/package.service";

type ModalMode = "create" | "edit" | "view" | null;

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

      <div className="flex-1 p-8">
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
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

// ── View Modal ──────────────────────────────────────────────────────────────
function PackageViewModal({
  pkg,
  onClose,
  onEdit,
}: {
  pkg: Package;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Package</p>
          <h2 className="text-xl font-bold text-white">{pkg.title}</h2>
          <p className="text-violet-200 text-sm mt-1">
            ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
          <p className="text-slate-700 text-sm leading-relaxed">{pkg.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Category</p>
            <p className="text-sm font-bold text-violet-700">{pkg.category?.name ?? "—"}</p>
          </div>
          <div className="bg-sky-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">Destination</p>
            <p className="text-sm font-bold text-sky-700">{pkg.destination?.title ?? "—"}</p>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Price</p>
          <p className="text-2xl font-bold text-emerald-700">
            ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Created {new Date(pkg.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
          Close
        </button>
        <button onClick={onEdit} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-medium transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}