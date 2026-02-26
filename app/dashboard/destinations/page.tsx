"use client";

import { useState } from "react";
import DestinationForm from "@/components/Dashboard/DestinationForm";
import DestinationTable from "@/components/Dashboard/DestinationTable";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useDestinations } from "@/utils/hooks/useDestinations";

type ModalMode = "create" | "edit" | "view" | null;

interface Destination {
  id: string;
  title: string;
  description: string;
  price: number | string;
  categoryId: string | number;
}

export default function DashboardPage() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  const {
    data: destinations,
    isLoading,
    isError,
    createDestination,
    updateDestination,
    deleteDestination,
    creating,
    updating,
  } = useDestinations();

  const openCreate = () => {
    setSelectedDestination(null);
    setModalMode("create");
  };

  const openEdit = (destination: Destination) => {
    setSelectedDestination(destination);
    setModalMode("edit");
  };

  const openView = (destination: Destination) => {
    setSelectedDestination(destination);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedDestination(null);
  };

  const handleCreate = (data: Omit<Destination, "id">) => {
    createDestination(data, { onSuccess: closeModal });
  };

  const handleUpdate = (data: Omit<Destination, "id">) => {
    if (!selectedDestination) return;
    updateDestination({ id: selectedDestination.id, payload: data }, { onSuccess: closeModal });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this destination?")) {
      deleteDestination(id);
    }
  };

  const isOpen = modalMode !== null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Destinations</h1>
            <p className="text-sm text-slate-500 mt-1">
              {destinations?.length ?? 0} total destinations
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-medium shadow-sm text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Destination
          </button>
        </div>

        {/* Content */}
        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            Failed to load destinations. Please refresh the page.
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm text-slate-400">Loading destinations...</p>
          </div>
        ) : (
          <DestinationTable
            destinations={destinations ?? []}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-lg">
            {modalMode === "view" && selectedDestination ? (
              <DestinationDetailModal
                destination={selectedDestination}
                onClose={closeModal}
                onEdit={() => setModalMode("edit")}
              />
            ) : (
              <DestinationForm
                mode={modalMode === "edit" ? "edit" : "create"}
                initialData={selectedDestination ?? undefined}
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

// ──────────────────────────────────────────────
// Detail / View Modal
// ──────────────────────────────────────────────
function DestinationDetailModal({
  destination,
  onClose,
  onEdit,
}: {
  destination: { id: string; title: string; description: string; price: number | string; categoryId: string | number };
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Destination</p>
            <h2 className="text-xl font-bold text-white">{destination.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
          <p className="text-slate-700 text-sm leading-relaxed">{destination.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Price</p>
            <p className="text-lg font-bold text-slate-900">
              ${Number(destination.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category ID</p>
            <p className="text-lg font-bold text-slate-900">{destination.categoryId}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          Close
        </button>
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Edit
        </button>
      </div>
    </div>
  );
}