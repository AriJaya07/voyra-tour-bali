"use client";

import { useState, useEffect } from "react";
import { Location } from "@/utils/service/location.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { Field, inputClass } from "@/components/common/InputForm";
import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import LinkIcon from "@/components/assets/dashboard/LinkIcon";

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

  const handleChange =
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
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        <Field label="Title" error={errors.title} required>
          <input
            type="text"
            value={formData.title}
            placeholder="Title..." 
            onChange={handleChange("title")}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field label="DestinationId" error={errors.destinationId} required>
          <select
            value={formData.destinationId}
            onChange={handleChange("destinationId")}
            className={inputClass(!!errors.destinationId)}
          >
            <option value={0}>— Select Destination —</option>
            {destinations.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Image" error={errors.title} required>
          <div className="flex flex-row gap-1">
            <input
              type="text"
              value={formData.image}
              placeholder="https://example.com/image.jpg" 
              onChange={handleChange("image")}
              className={inputClass(!!errors.image)}
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
        </Field>

        <Field label="Link / URL" error={errors.hrefLink} required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <LinkIcon />
            </span>
            <div className="pl-9">
              <input
                type="text"
                value={formData.hrefLink}
                placeholder="https://maps.google.com/..."
                onChange={handleChange("hrefLink")}
                className={inputClass(!!errors.hrefLink)}
              />
            </div>
          </div>
        </Field>

        <Field label="Description" error={errors.description} required>
          <textarea
            placeholder="Deskripsi singkat tentang lokasi ini..."
            value={formData.description}
            onChange={handleChange("description")}
            className={inputClass(!!errors.description)}
          />
        </Field>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center w-[150px]"
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