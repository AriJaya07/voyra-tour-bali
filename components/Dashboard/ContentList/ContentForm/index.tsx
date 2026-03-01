"use client";

import { useState, useEffect } from "react";
import { Content } from "@/utils/service/content.service";
import { useDestinations } from "@/utils/hooks/useDestinations";

interface FormData {
  title: string;
  subTitle: string;
  description: string;
  image1: string;
  image2: string;
  image3: string;
  image4: string;
  image5: string;
  imageMain: string;
  dateAvailable: string;
  isAvailable: boolean;
  destinationId: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Content;
  preselectedDestinationId?: number;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const inputCls = (err?: boolean) =>
  `w-full px-3 py-2.5 bg-slate-800 border rounded-xl text-sm text-slate-200 placeholder-slate-600 
   focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
     err
       ? "border-red-500/60 bg-red-950/20"
       : "border-slate-700 focus:border-orange-500/50"
   }`;

export default function ContentForm({
  mode, initialData, preselectedDestinationId, onSubmit, onCancel, isLoading,
}: Props) {
  const { data: destinations } = useDestinations();

  const empty: FormData = {
    title: "", subTitle: "", description: "",
    image1: "", image2: "", image3: "", image4: "", image5: "",
    imageMain: "",
    dateAvailable: new Date().toISOString().split("T")[0],
    isAvailable: true,
    destinationId: preselectedDestinationId ? String(preselectedDestinationId) : "",
  };

  const [formData, setFormData] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        subTitle: initialData.subTitle ?? "",
        description: initialData.description,
        image1: initialData.image1 ?? "",
        image2: initialData.image2 ?? "",
        image3: initialData.image3 ?? "",
        image4: initialData.image4 ?? "",
        image5: initialData.image5 ?? "",
        imageMain: initialData.imageMain ?? "",
        dateAvailable: initialData.dateAvailable.split("T")[0],
        isAvailable: initialData.isAvailable,
        destinationId: String(initialData.destinationId),
      });
    }
  }, [initialData]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setFormData((p) => ({ ...p, [field]: value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
    };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.title.trim()) e.title = "Title wajib diisi";
    if (!formData.description.trim()) e.description = "Description wajib diisi";
    if (!formData.destinationId) e.destinationId = "Destinasi wajib dipilih";
    if (!formData.dateAvailable) e.dateAvailable = "Tanggal wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const imageFields = [
    { key: "imageMain" as const, label: "Image Utama" },
    { key: "image1" as const, label: "Image 1" },
    { key: "image2" as const, label: "Image 2" },
    { key: "image3" as const, label: "Image 3" },
    { key: "image4" as const, label: "Image 4" },
    { key: "image5" as const, label: "Image 5" },
  ];

  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {mode === "create" ? "New Entry" : "Editing"}
          </p>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            {mode === "create" ? "Tambah Content" : "Edit Content"}
          </h2>
        </div>
        <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

        {/* Destination */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Destinasi <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.destinationId}
            onChange={set("destinationId")}
            disabled={!!preselectedDestinationId}
            className={inputCls(!!errors.destinationId)}
          >
            <option value="">— Pilih Destinasi —</option>
            {(destinations as any[]).map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
          {errors.destinationId && <p className="text-xs text-red-400 mt-1">{errors.destinationId}</p>}
        </div>

        {/* Title + SubTitle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Judul konten"
              value={formData.title}
              onChange={set("title")}
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Sub Title <span className="text-slate-600 font-normal normal-case">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Sub judul konten"
              value={formData.subTitle}
              onChange={set("subTitle")}
              className={inputCls()}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            placeholder="Deskripsi lengkap konten..."
            value={formData.description}
            onChange={set("description")}
            rows={4}
            className={`${inputCls(!!errors.description)} resize-none`}
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Date + isAvailable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Tanggal Tersedia <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.dateAvailable}
              onChange={set("dateAvailable")}
              className={inputCls(!!errors.dateAvailable)}
            />
            {errors.dateAvailable && <p className="text-xs text-red-400 mt-1">{errors.dateAvailable}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="flex items-center gap-3 h-10">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={set("isAvailable")}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      formData.isAvailable ? "bg-orange-500" : "bg-slate-700"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      formData.isAvailable ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className={`text-sm font-medium ${formData.isAvailable ? "text-orange-400" : "text-slate-500"}`}>
                  {formData.isAvailable ? "Tersedia" : "Tidak Tersedia"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Images <span className="text-slate-600 font-normal normal-case">(URL opsional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {imageFields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData[key] as string}
                    onChange={set(key)}
                    className={`${inputCls()} flex-1 text-xs`}
                  />
                  {(formData[key] as string) && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                      <img
                        src={formData[key] as string}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-1">
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
            className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === "create" ? "Tambah Content" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}