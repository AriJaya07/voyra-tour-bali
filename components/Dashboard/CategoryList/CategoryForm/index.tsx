"use client";

import { useState, useEffect } from "react";
import { Category } from "@/utils/service/category.service";
import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";
import { Field, inputClass } from "@/components/common/InputForm";

interface FormData {
  name: string;
  slug: string;
  description: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Category;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function CategoryForm({ mode, initialData, onSubmit, onCancel, isLoading }: Props) {
  const [formData, setFormData] = useState<FormData>({ name: "", slug: "", description: "" });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description ?? "",
      });
      setSlugManuallyEdited(true);
    }
  }, [initialData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : slugify(name),
    }));
    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
    if (errors.slug) setErrors((p) => ({ ...p, slug: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!formData.slug.trim()) e.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(formData.slug)) e.slug = "Only lowercase letters, numbers, hyphens";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {mode === "create" ? "New Entry" : "Editing"}
          </p>
          <h2 className="text-xl font-bold text-white">
            {mode === "create" ? "Create Category" : "Update Category"}
          </h2>
        </div>
        <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Adventure Tours"
            value={formData.name}
            onChange={handleNameChange}
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
              errors.name ? "border-red-300 bg-red-50" : "border-slate-200"
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        {/* <Field label="Name" error={errors.name} required>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            className={inputClass(!!errors.name)}
          />
        </Field> */}

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Slug <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">/</span>
            <input
              type="text"
              placeholder="adventure-tours"
              value={formData.slug}
              onChange={handleSlugChange}
              className={`w-full pl-6 pr-3 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
                errors.slug ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
          </div>
          {errors.slug ? (
            <p className="text-xs text-red-500 mt-1">{errors.slug}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Auto-generated from name. Only a–z, 0–9, hyphens.</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Description <span className="text-slate-300 font-normal normal-case">(optional)</span>
          </label>
          <textarea
            placeholder="Brief description of this category..."
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2 w-[150px]"
          >
            {isLoading && (
              <SpinnerIcon />
            )}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}