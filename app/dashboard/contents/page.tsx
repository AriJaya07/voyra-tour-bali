"use client";

import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useContents } from "@/utils/hooks/useContents";
import { Content } from "@/utils/service/content.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import ContentForm from "@/components/Dashboard/ContentList/ContentForm";
import ContentTable from "@/components/Dashboard/ContentList/ContentTable";

type ModalMode = "create" | "edit" | "view" | null;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

export default function DashboardContentsPage() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Content | null>(null);
  const [filterDestId, setFilterDestId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "unavailable">("all");

  const {
    data: contents, isLoading, isError,
    createContent, updateContent, deleteContent,
    creating, updating,
  } = useContents(filterDestId ? Number(filterDestId) : undefined);

  const { data: destinations } = useDestinations();

  const filtered = contents.filter((c) => {
    if (filterStatus === "available") return c.isAvailable;
    if (filterStatus === "unavailable") return !c.isAvailable;
    return true;
  });

  const openCreate = () => { setSelected(null); setModalMode("create"); };
  const openEdit = (c: Content) => { setSelected(c); setModalMode("edit"); };
  const openView = (c: Content) => { setSelected(c); setModalMode("view"); };
  const closeModal = () => { setModalMode(null); setSelected(null); };

  const handleCreate = (data: any) => createContent(data, { onSuccess: closeModal });
  const handleUpdate = (data: any) => {
    if (!selected) return;
    updateContent({ id: selected.id, payload: data }, { onSuccess: closeModal });
  };
  const handleDelete = (id: number) => {
    if (confirm("Hapus content ini? Data tidak bisa dikembalikan."))
      deleteContent(id);
  };

  const totalAvailable = contents.filter((c) => c.isAvailable).length;
  const totalImages = contents.reduce((sum, c) =>
    sum + [c.image1, c.image2, c.image3, c.image4, c.image5].filter(Boolean).length, 0);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Manajemen</p>
              <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                Contents
              </h1>
              <p className="text-slate-500 text-sm mt-1">{contents.length} total content</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 active:scale-95 transition-all font-semibold shadow-lg shadow-orange-900/40 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Content
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Content", value: contents.length, color: "orange" },
              { label: "Tersedia", value: totalAvailable, color: "emerald" },
              { label: "Nonaktif", value: contents.length - totalAvailable, color: "slate" },
              { label: "Total Images", value: totalImages, color: "amber" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-3xl font-black text-${s.color}-400`} style={{ fontFamily: "'Syne', sans-serif" }}>
                  {isLoading ? "—" : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</label>

            {/* Destination filter */}
            <select
              value={filterDestId}
              onChange={(e) => setFilterDestId(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            >
              <option value="">Semua Destinasi</option>
              {(destinations as any[]).map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>

            {/* Status filter */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {(["all", "available", "unavailable"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === f
                      ? "bg-orange-600 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "all" ? "Semua" : f === "available" ? "Tersedia" : "Nonaktif"}
                </button>
              ))}
            </div>

            {(filterDestId || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterDestId(""); setFilterStatus("all"); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* ── Error ── */}
          {isError && (
            <div className="bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl px-4 py-3 text-sm">
              Gagal memuat contents. Coba refresh.
            </div>
          )}

          {/* ── Table ── */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              <p className="text-sm text-slate-500">Memuat contents...</p>
            </div>
          ) : (
            <ContentTable
              contents={filtered}
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh]">
            {modalMode === "view" && selected ? (
              <ContentViewModal content={selected} onClose={closeModal} onEdit={() => setModalMode("edit")} />
            ) : (
              <ContentForm
                mode={modalMode === "edit" ? "edit" : "create"}
                initialData={selected ?? undefined}
                preselectedDestinationId={filterDestId ? Number(filterDestId) : undefined}
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

// ── View Modal ──────────────────────────────────────────────
function ContentViewModal({
  content, onClose, onEdit,
}: {
  content: Content; onClose: () => void; onEdit: () => void;
}) {
  const images = [content.image1, content.image2, content.image3, content.image4, content.image5].filter(Boolean) as string[];
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 max-h-[90vh] overflow-y-auto">
      {/* Header image or gradient */}
      {content.imageMain ? (
        <div className="relative h-52 overflow-hidden">
          <img src={content.imageMain} alt={content.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-6 right-12">
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Content</p>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{content.title}</h2>
            {content.subTitle && <p className="text-slate-300 text-sm mt-0.5">{content.subTitle}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Content</p>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{content.title}</h2>
            {content.subTitle && <p className="text-orange-100 text-sm mt-0.5">{content.subTitle}</p>}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Meta row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Destinasi</p>
            <p className="text-blue-400 text-sm font-semibold truncate">{content.destination.title}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Tanggal</p>
            <p className="text-slate-300 text-xs">{fmtDate(content.dateAvailable)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Status</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${content.isAvailable ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${content.isAvailable ? "bg-emerald-400" : "bg-slate-500"}`} />
              {content.isAvailable ? "Tersedia" : "Nonaktif"}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deskripsi</p>
          <p className="text-slate-300 text-sm leading-relaxed">{content.description}</p>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Gallery ({images.length} gambar)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-700">
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors">
          Tutup
        </button>
        <button onClick={onEdit} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 text-sm font-semibold transition-colors">
          Edit Content
        </button>
      </div>
    </div>
  );
}