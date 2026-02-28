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
        <Field label="Name" error={errors.name} required>
          <input
            type="text"
            placeholder="e.g. Adventure Tours"
            value={formData.name}
            onChange={handleNameChange}
            className={inputClass(!!errors.name)}
          />
        </Field>

        <Field label="Slug" error={errors.slug} required>
          <input
            type="text"
            placeholder="e.g. Adventure Tours"
            value={formData.slug}
            onChange={handleSlugChange}
            className={inputClass(!!errors.slug)}
          />
        </Field>

        <Field label="Description" error={errors.description} required>
          <textarea
            placeholder="Brief description of this category..."
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className={inputClass(!!errors.description)}
          />
        </Field>

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