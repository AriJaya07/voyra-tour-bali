"use client";

import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useLocations } from "@/utils/hooks/useLocations";
import { Location } from "@/utils/service/location.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import LocationTable from "@/components/Dashboard/LocationList/LocationTable";
import LocationForm from "@/components/Dashboard/LocationList/LocationForm";
import Link from "next/link";

type ModalMode = "create" | "edit" | "view" | null;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function DashboardLocationsPage() {
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
              { label: "Punya Gambar", value: withImage, color: "teal" },
              { label: "Punya Link", value: withLink, color: "cyan" },
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

// ── View Modal ─────────────────────────────────────────────
function LocationViewModal({
  location,
  onClose,
  onEdit,
}: {
  location: Location;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
      {/* Header with image */}
      {location.image ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={location.image}
            alt={location.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-4 left-6 right-12">
            <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-1">
              Lokasi
            </p>
            <h2
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {location.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sky-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
              Lokasi
            </p>
            <h2
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {location.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Destination */}
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Destinasi
            </p>
            <p className="text-blue-400 text-sm font-semibold">
              {location.destination.title}
            </p>
          </div>
        </div>

        {/* Description */}
        {location.description && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Deskripsi
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {location.description}
            </p>
          </div>
        )}

        {/* Link */}
        {location.hrefLink && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Link
            </p>
            <Link
              href={location.hrefLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors break-all"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {location.hrefLink}
            </Link>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-800/40 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
              ID
            </p>
            <p className="text-slate-300 text-sm font-mono">#{location.id}</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Dibuat
            </p>
            <p className="text-slate-300 text-sm">{fmtDate(location.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors"
        >
          Tutup
        </button>
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 text-sm font-semibold transition-colors"
        >
          Edit Lokasi
        </button>
      </div>
    </div>
  );
}