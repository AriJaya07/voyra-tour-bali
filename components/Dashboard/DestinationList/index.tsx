import { useState } from "react";
import DestinationForm from "@/components/Dashboard/DestinationList/DestinationForm";
import DestinationTable from "@/components/Dashboard/DestinationList/DestinationTable";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { ModalMode } from "@/components/common/InputForm";
import { Destination, DestinationFormData } from "@/utils/service/destination.service";
import { DestinationDetailModal } from "@/components/Dashboard/DestinationList/DestinationDetailModal";
import DashboardPageHeader from "@/components/Dashboard/common/DashboardPageHeader";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import { LoadingState, ErrorBanner } from "@/components/Dashboard/common/LoadingState";

export default function DestinationList() {
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

    const handleCreate = (data: DestinationFormData) => {
      createDestination(data, { onSuccess: closeModal });
    };

    const handleUpdate = (data: DestinationFormData) => {
      if (!selectedDestination) return;
      updateDestination({ id: selectedDestination.id, payload: data }, { onSuccess: closeModal });
    };

    const handleDelete = (id: number) => {
      if (confirm("Are you sure you want to delete this destination?")) {
        deleteDestination(id);
      }
    };

    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DashboardPageHeader
          section="Manajemen"
          title="Destinations"
          subtitle={`${destinations?.length ?? 0} total destinations`}
          buttonLabel="Add Destination"
          onButtonClick={openCreate}
          accent="blue"
        />

        {isError && <ErrorBanner message="Failed to load destinations. Please refresh the page." />}

        {isLoading ? (
          <LoadingState message="Loading destinations..." accent="blue" />
        ) : (
          <DestinationTable
            destinations={destinations ?? []}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        <DashboardModal open={modalMode !== null} onClose={closeModal}>
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
        </DashboardModal>
      </div>
    );
}
