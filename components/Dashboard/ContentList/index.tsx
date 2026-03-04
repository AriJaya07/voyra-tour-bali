import { useState } from "react";
import { useContents } from "@/utils/hooks/useContents";
import { Content, ContentPayload } from "@/utils/service/content.service";
import { Destination } from "@/utils/service/destination.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import ContentForm from "@/components/Dashboard/ContentList/ContentForm";
import ContentTable from "@/components/Dashboard/ContentList/ContentTable";
import { ModalMode } from "@/components/common/InputForm";
import ContentViewModal from "@/components/Dashboard/ContentList/ContentViewModal";
import DashboardPageHeader from "@/components/Dashboard/common/DashboardPageHeader";
import DashboardModal from "@/components/Dashboard/common/DashboardModal";
import StatsGrid from "@/components/Dashboard/common/StatsGrid";
import { LoadingState, ErrorBanner } from "@/components/Dashboard/common/LoadingState";

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

    const handleCreate = (data: ContentPayload) => createContent(data, { onSuccess: closeModal });
    const handleUpdate = (data: Partial<ContentPayload>) => {
      if (!selected) return;
      updateContent({ id: selected.id, payload: data }, { onSuccess: closeModal });
    };
    const handleDelete = (id: number) => {
      if (confirm("Hapus content ini? Data tidak bisa dikembalikan."))
        deleteContent(id);
    };

    const totalAvailable = contents.filter((c) => c.isAvailable).length;
    const totalImages = contents.reduce((sum, c) =>
      sum + c.images.filter(Boolean).length, 0);

    const stats = [
      { label: "Total Content", value: contents.length, color: "orange" as const },
      { label: "Tersedia", value: totalAvailable, color: "emerald" as const },
      { label: "Nonaktif", value: contents.length - totalAvailable, color: "sky" as const },
      { label: "Total Images", value: totalImages, color: "amber" as const },
    ];

    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DashboardPageHeader
          section="Manajemen"
          title="Contents"
          subtitle={`${contents.length} total content`}
          buttonLabel="Tambah Content"
          onButtonClick={openCreate}
          accent="orange"
        />

        <StatsGrid stats={stats} isLoading={isLoading} />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</label>

          <select
            value={filterDestId}
            onChange={(e) => setFilterDestId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
          >
            <option value="">Semua Destinasi</option>
            {(destinations as Destination[]).map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>

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
              Reset
            </button>
          )}
        </div>

        {isError && <ErrorBanner message="Gagal memuat contents. Coba refresh." />}

        {isLoading ? (
          <LoadingState message="Memuat contents..." accent="orange" />
        ) : (
          <ContentTable
            contents={filtered}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        <DashboardModal open={modalMode !== null} onClose={closeModal} maxWidth="max-w-2xl">
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
        </DashboardModal>
      </div>
    );
}
