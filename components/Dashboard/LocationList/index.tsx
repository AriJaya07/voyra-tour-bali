import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useLocations } from "@/utils/hooks/useLocations";
import { Location } from "@/utils/service/location.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import LocationTable from "@/components/Dashboard/LocationList/LocationTable";
import LocationForm from "@/components/Dashboard/LocationList/LocationForm";
import { ModalMode } from "@/components/common/InputForm";
import LocationViewModal from "@/components/Dashboard/LocationList/LocationViewModal";

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
  
    const handleCreate = (data: any) =>
      createLocation(data, { onSuccess: closeModal });
    const handleUpdate = (data: any) => {
      if (!selected) return;
      updateLocation({ id: selected.id, payload: data }, { onSuccess: closeModal });
    };
    const handleDelete = (id: number) => {
      if (confirm("Hapus lokasi ini? Data tidak bisa dikembalikan."))
        deleteLocation(id);
    };
  
    // Stats
    const withImage = locations.filter((l) => l.image).length;
    const withLink = locations.filter((l) => l.hrefLink).length;
    const uniqueDests = new Set(locations.map((l) => l.destinationId)).size;
  
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
  
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
  
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Manajemen
                </p>
                <h1
                  className="text-3xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Lokasi
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {locations.length} total lokasi
                </p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 active:scale-95 transition-all font-semibold shadow-lg shadow-sky-900/40 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Lokasi
              </button>
            </div>
  
            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Lokasi", value: locations.length, color: "sky" },
                { label: "Destinasi Unik", value: uniqueDests, color: "blue" },
                { label: "Punya Gambar", value: withImage, color: "orange" },
                { label: "Punya Link", value: withLink, color: "emerald" },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4`}
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {s.label}
                  </p>
                  <p
                    className={`text-3xl font-black text-${s.color}-400`}
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {isLoading ? "—" : s.value}
                  </p>
                </div>
              ))}
            </div>
  
            {/* ── Filter by Destination ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Filter:
              </label>
              <select
                value={filterDestId}
                onChange={(e) => setFilterDestId(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              >
                <option value="">Semua Destinasi</option>
                {(destinations as any[]).map((d) => (
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
                  ✕ Reset
                </button>
              )}
            </div>
  
            {/* ── Error ── */}
            {isError && (
              <div className="bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl px-4 py-3 text-sm">
                Gagal memuat lokasi. Coba refresh.
              </div>
            )}
  
            {/* ── Table ── */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
                <p className="text-sm text-slate-500">Memuat lokasi...</p>
              </div>
            ) : (
              <LocationTable
                locations={locations}
                onView={openView}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
  
        {/* ── Modal ── */}
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
            </div>
          </div>
        )}
      </div>
    );
}