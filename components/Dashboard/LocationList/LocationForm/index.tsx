"use client";

import { useState, useEffect } from "react";
import { Location } from "@/utils/service/location.service";
import { useDestinations } from "@/utils/hooks/useDestinations";

interface FormData {
  title: string;
  image: string;
  hrefLink: string;
  description: string;
  destinationId: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Location;
  preselectedDestinationId?: number;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function LocationForm({
  mode,
  initialData,
  preselectedDestinationId,
  onSubmit,
  onCancel,
  isLoading,
}: Props) {
  const { data: destinations } = useDestinations();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    image: "",
    hrefLink: "",
    description: "",
    destinationId: preselectedDestinationId ? String(preselectedDestinationId) : "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        image: initialData.image ?? "",
        hrefLink: initialData.hrefLink ?? "",
        description: initialData.description ?? "",
        destinationId: String(initialData.destinationId),
      });
    }
  }, [initialData]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
    };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!formData.title.trim()) e.title = "Title wajib diisi";
    if (!formData.destinationId) e.destinationId = "Destinasi wajib dipilih";
    if (formData.hrefLink && !/^https?:\/\//i.test(formData.hrefLink)) {
      e.hrefLink = "Link harus dimulai dengan http:// atau https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 bg-slate-800 border rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
      err ? "border-red-500/60 bg-red-950/20" : "border-slate-700 focus:border-sky-500/50"
    }`;

  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sky-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {mode === "create" ? "New Entry" : "Editing"}
          </p>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {mode === "create" ? "Tambah Lokasi" : "Edit Lokasi"}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Pantai Kuta, Ubud Rice Terraces"
            value={formData.title}
            onChange={set("title")}
            className={inputCls(errors.title)}
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Destinasi <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.destinationId}
            onChange={set("destinationId")}
            className={inputCls(errors.destinationId)}
            disabled={!!preselectedDestinationId}
          >
            <option value="">— Pilih Destinasi —</option>
            {destinations.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          {errors.destinationId && (
            <p className="text-xs text-red-400 mt-1">{errors.destinationId}</p>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Image URL{" "}
            <span className="text-slate-600 font-normal normal-case">(opsional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.image}
              onChange={set("image")}
              className={`${inputCls()} flex-1`}
            />
            {formData.image && (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                <img
                  src={formData.image}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>
        </div>

        {/* HrefLink */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Link / URL{" "}
            <span className="text-slate-600 font-normal normal-case">(opsional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={formData.hrefLink}
              onChange={set("hrefLink")}
              className={`${inputCls(errors.hrefLink)} pl-9`}
            />
          </div>
          {errors.hrefLink && (
            <p className="text-xs text-red-400 mt-1">{errors.hrefLink}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Deskripsi{" "}
            <span className="text-slate-600 font-normal normal-case">(opsional)</span>
          </label>
          <textarea
            placeholder="Deskripsi singkat tentang lokasi ini..."
            value={formData.description}
            onChange={set("description")}
            rows={3}
            className={`${inputCls()} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === "create" ? "Tambah Lokasi" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}