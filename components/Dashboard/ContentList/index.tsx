import { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useContents } from "@/utils/hooks/useContents";
import { Content } from "@/utils/service/content.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import ContentForm from "@/components/Dashboard/ContentList/ContentForm";
import ContentTable from "@/components/Dashboard/ContentList/ContentTable";
import { ModalMode } from "@/components/common/InputForm";
import ContentViewModal from "@/components/Dashboard/ContentList/ContentViewModal";

export default function ContentList() {
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