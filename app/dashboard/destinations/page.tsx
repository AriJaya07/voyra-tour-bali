"use client";

import { useState } from "react";
import DestinationForm from "@/components/Dashboard/DestinationList/DestinationForm";
import DestinationTable from "@/components/Dashboard/DestinationList/DestinationTable";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { ModalMode } from "@/components/common/InputForm";
import { Destination } from "@/utils/service/destination.service";
import { DestinationDetailModal } from "@/components/Dashboard/DestinationList/ModalDetail";
import PlusIcon from "@/components/assets/dashboard/PlusIcon";


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

      <div className="flex-1 md:py-8 py-4 md:px-8 px-4">
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
            <PlusIcon />
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