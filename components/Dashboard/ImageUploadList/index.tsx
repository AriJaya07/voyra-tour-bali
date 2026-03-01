import { useState, useRef, useCallback } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useImages } from "@/utils/hooks/useImages";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { usePackages } from "@/utils/hooks/usePackages";
import { ImageItem } from "@/utils/service/image.service";
import { ActionButton } from "@/components/common/InputForm";
import EyesIcon from "@/components/assets/dashboard/EyesIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";
import TrashIcon from "@/components/assets/dashboard/TrashIcon";
import LinkImageModal from "@/components/Dashboard/ImageUploadList/LinkImageModal";
import ImageCard from "@/components/Dashboard/ImageUploadList/ImageCard";
import Lightbox from "@/components/Dashboard/ImageUploadList/Lightbox";
import { FilterType, fmtDate, ViewMode } from "@/components/common/ListForm";

export default function ImageUploadList() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);
  const [linkModalImage, setLinkModalImage] = useState<ImageItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ file: File; preview: string; progress: "pending" | "uploading" | "done" | "error" }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images, isLoading, isError, uploadImageAsync, updateImage, deleteImage, uploading } = useImages();
  const { data: destinations } = useDestinations();
  const { data: packages } = usePackages();

  // ── Filter logic ──────────────────────────────────────
  const filtered = images.filter((img) => {
    if (filter === "destinations") return img.destinationId !== null;
    if (filter === "packages") return img.packageId !== null;
    if (filter === "unlinked") return !img.destinationId && !img.packageId;
    return true;
  });

  // ── File handling ─────────────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!fileArray.length) return;

      const newQueue = fileArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: "pending" as const,
      }));
      setUploadQueue((prev) => [...prev, ...newQueue]);

      for (let i = 0; i < newQueue.length; i++) {
        setUploadQueue((prev) =>
          prev.map((q, idx) =>
            idx === prev.length - newQueue.length + i ? { ...q, progress: "uploading" } : q
          )
        );
        try {
          await uploadImageAsync({ file: newQueue[i].file });
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === prev.length - newQueue.length + i ? { ...q, progress: "done" } : q
            )
          );
        } catch {
          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === prev.length - newQueue.length + i ? { ...q, progress: "error" } : q
            )
          );
        }
      }

      // Clear done/error queue setelah 3 detik
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((q) => q.progress === "pending" || q.progress === "uploading"));
      }, 3000);
    },
    [uploadImageAsync]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDelete = (id: number) => {
    if (confirm("Hapus gambar ini? Tidak bisa dikembalikan.")) {
      deleteImage(id);
      if (lightboxImage?.id === id) setLightboxImage(null);
    }
  };

  const totalLinked = images.filter((i) => i.destinationId || i.packageId).length;
  const totalUnlinked = images.filter((i) => !i.destinationId && !i.packageId).length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Media</p>
              <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                Image Manager
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {images.length} total · {totalLinked} tertaut · {totalUnlinked} bebas
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 active:scale-95 transition-all font-semibold shadow-lg shadow-rose-900/40 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Upload Gambar
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Gambar", value: images.length, color: "bg-rose-500/10 border-rose-500/20 text-rose-300" },
              { label: "Destinasi", value: images.filter((i) => i.destinationId).length, color: "bg-blue-500/10 border-blue-500/20 text-blue-300" },
              { label: "Package", value: images.filter((i) => i.packageId).length, color: "bg-violet-500/10 border-violet-500/20 text-violet-300" },
              { label: "Tidak Tertaut", value: totalUnlinked, color: "bg-amber-500/10 border-amber-500/20 text-amber-300" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border px-4 py-3 ${s.color.split(" ").slice(0, 2).join(" ")}`}>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className={`text-2xl font-black ${s.color.split(" ")[2]}`} style={{ fontFamily: "'Syne', sans-serif" }}>
                  {isLoading ? "—" : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Drop Zone ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? "border-rose-500 bg-rose-500/10 scale-[1.01]"
                : "border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDragOver ? "bg-rose-500/20" : "bg-slate-800"}`}>
                <svg className={`w-6 h-6 transition-colors ${isDragOver ? "text-rose-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold text-sm transition-colors ${isDragOver ? "text-rose-300" : "text-slate-400"}`}>
                  {isDragOver ? "Lepas untuk upload" : "Drag & drop gambar di sini"}
                </p>
                <p className="text-slate-600 text-xs mt-1">atau klik untuk pilih · JPEG, PNG, WEBP, GIF · Max 5MB per file</p>
              </div>
            </div>
          </div>

          {/* ── Upload Queue Progress ── */}
          {uploadQueue.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upload Progress</p>
              {uploadQueue.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs font-medium truncate">{item.file.name}</p>
                    <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.progress === "done" ? "w-full bg-emerald-500"
                          : item.progress === "error" ? "w-full bg-red-500"
                          : item.progress === "uploading" ? "w-3/4 bg-rose-500 animate-pulse"
                          : "w-0 bg-slate-600"
                        }`}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${
                    item.progress === "done" ? "text-emerald-400"
                    : item.progress === "error" ? "text-red-400"
                    : item.progress === "uploading" ? "text-rose-400"
                    : "text-slate-600"
                  }`}>
                    {item.progress === "done" ? "✓ Done"
                      : item.progress === "error" ? "✗ Error"
                      : item.progress === "uploading" ? "Uploading..."
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Filter Bar + View Toggle ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {(["all", "destinations", "packages", "unlinked"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    filter === f
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "all" ? `Semua (${images.length})`
                    : f === "destinations" ? `Destinasi (${images.filter((i) => i.destinationId).length})`
                    : f === "packages" ? `Package (${images.filter((i) => i.packageId).length})`
                    : `Bebas (${totalUnlinked})`}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {isError && (
            <div className="bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl px-4 py-3 text-sm">
              Gagal memuat gambar. Coba refresh.
            </div>
          )}

          {/* ── Loading ── */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 text-2xl">🖼️</div>
              <p className="text-slate-500 font-semibold">Belum ada gambar</p>
              <p className="text-slate-600 text-sm mt-1">Upload gambar untuk mulai</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  onView={() => setLightboxImage(img)}
                  onLink={() => setLinkModalImage(img)}
                  onDelete={() => handleDelete(img.id)}
                />
              ))}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-800/50 border-b border-slate-800">
                {["Preview", "ID & Tanggal", "Destinasi", "Package", "Aksi"].map((h) => (
                  <p key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-slate-800">
                {filtered.map((img) => (
                  <div key={img.id} className="grid grid-cols-[80px_1fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors group">
                    <img
                      src={img.url}
                      alt=""
                      className="w-16 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxImage(img)}
                    />
                    <div>
                      <p className="text-slate-300 text-xs font-mono">#{img.id}</p>
                      <p className="text-slate-600 text-xs">{fmtDate(img.createdAt)}</p>
                    </div>
                    <div>
                      {img.destination ? (
                        <span className="px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                          {img.destination.title}
                        </span>
                      ) : <span className="text-slate-700 text-xs">—</span>}
                    </div>
                    <div>
                      {img.package ? (
                        <span className="px-2 py-1 rounded-full bg-violet-500/15 text-violet-400 text-xs font-medium border border-violet-500/20">
                          {img.package.title}
                        </span>
                      ) : <span className="text-slate-700 text-xs">—</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton
                        onClick={() => setLightboxImage(img)}
                        title="View"
                        color="text-slate-500 hover:bg-slate-100"
                        icon={
                          <EyesIcon />
                        }
                      />
                      <ActionButton
                        onClick={() => setLinkModalImage(img)}
                        title="Edit"
                        color="text-emerald-500 hover:bg-emerald-50"
                        icon={
                          <PencilIcon />
                        }
                      />
                      <ActionButton
                        onClick={() => handleDelete(img.id)}
                        title="Delete"
                        color="text-red-400 hover:bg-red-50"
                        icon={
                          <TrashIcon />
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          images={filtered}
          onClose={() => setLightboxImage(null)}
          onNavigate={setLightboxImage}
          onLink={() => { setLinkModalImage(lightboxImage); setLightboxImage(null); }}
          onDelete={() => { handleDelete(lightboxImage.id); setLightboxImage(null); }}
        />
      )}

      {/* ── Link Modal ── */}
      {linkModalImage && (
        <LinkImageModal
          image={linkModalImage}
          destinations={destinations as any[]}
          packages={packages as any[]}
          onSave={(destinationId, packageId) => {
            updateImage({ id: linkModalImage.id, payload: { destinationId, packageId } });
            setLinkModalImage(null);
          }}
          onClose={() => setLinkModalImage(null)}
        />
      )}
    </div>
  );
}