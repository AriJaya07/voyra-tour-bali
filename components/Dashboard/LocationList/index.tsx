import { useState } from "react";
import { useLocations } from "@/utils/hooks/useLocations";
import { Location, LocationPayload } from "@/utils/service/location.service";
import { Destination } from "@/utils/service/destination.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import LocationTable from "@/components/Dashboard/LocationList/LocationTable";
import LocationForm from "@/components/Dashboard/LocationList/LocationForm";
import { ModalMode } from "@/components/common/InputForm";
import LocationViewModal from "@/components/Dashboard/LocationList/LocationViewModal";
import DashboardPageHeader from "@/components/Dashboard/common/DashboardPageHeader";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import StatsGrid from "@/components/Dashboard/common/StatsGrid";
import { LoadingState, ErrorBanner } from "@/components/Dashboard/common/LoadingState";

export default function LocationList() {
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selected, setSelected] = useState<Location | null>(null);
    const [filterDestId, setFilterDestId] = useState<string>("");

    const {
      data: locations,
      isLoading,
      isError,
      createLocation,
      updateLocation,
      deleteLocation,
      creating,
      updating,
    } = useLocations(filterDestId ? Number(filterDestId) : undefined);

    const { data: destinations } = useDestinations();

    const openCreate = () => {
      setSelected(null);
      setModalMode("create");
    };
    const openEdit = (l: Location) => {
      setSelected(l);
      setModalMode("edit");
    };
    const openView = (l: Location) => {
      setSelected(l);
      setModalMode("view");
    };
    const closeModal = () => {
      setModalMode(null);
      setSelected(null);
    };

    const handleCreate = (data: LocationPayload) =>
      createLocation(data, { onSuccess: closeModal });
    const handleUpdate = (data: Partial<LocationPayload>) => {
      if (!selected) return;
      updateLocation({ id: selected.id, payload: data }, { onSuccess: closeModal });
    };
    const handleDelete = (id: number) => {
      if (confirm("Delete this location? This action cannot be undone."))
        deleteLocation(id);
    };

    const withImage = locations.filter((l) => l.images).length;
    const withLink = locations.filter((l) => l.hrefLink).length;
    const uniqueDests = new Set(locations.map((l) => l.destinationId)).size;

    const stats = [
      { label: "Total Locations", value: locations.length, color: "sky" as const },
      { label: "Unique Destinations", value: uniqueDests, color: "blue" as const },
      { label: "With Image", value: withImage, color: "orange" as const },
      { label: "With Link", value: withLink, color: "emerald" as const },
    ];

    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DashboardPageHeader
          section="Management"
          title="Locations"
          subtitle={`${locations.length} total location${locations.length !== 1 ? "s" : ""}`}
          buttonLabel="Add Location"
          onButtonClick={openCreate}
          accent="sky"
        />

        <StatsGrid stats={stats} isLoading={isLoading} />

        {/* Filter by Destination */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Filter:
          </label>
          <select
            value={filterDestId}
            onChange={(e) => setFilterDestId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          >
            <option value="">All Destinations</option>
            {(destinations as Destination[]).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          {filterDestId && (
            <button
              onClick={() => setFilterDestId("")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {isError && <ErrorBanner message="Failed to load locations. Please refresh." />}

        {isLoading ? (
          <LoadingState message="Loading locations..." accent="sky" />
        ) : (
          <LocationTable
            locations={locations}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        <DashboardModal open={modalMode !== null} onClose={closeModal}>
          {modalMode === "view" && selected ? (
            <LocationViewModal
              location={selected}
              onClose={closeModal}
              onEdit={() => setModalMode("edit")}
            />
          ) : (
            <LocationForm
              mode={modalMode === "edit" ? "edit" : "create"}
              initialData={selected ?? undefined}
              preselectedDestinationId={
                filterDestId ? Number(filterDestId) : undefined
              }
              onSubmit={modalMode === "edit" ? handleUpdate : handleCreate}
              onCancel={closeModal}
              isLoading={creating || updating}
            />
          )}
        </DashboardModal>
      </div>
    );
}
