"use client";

import { useState, useEffect } from "react";
import { Category } from "@/utils/service/category.service";
import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";
import { Field, inputClass, slugify } from "@/components/common/InputForm";
import { useImages } from "@/utils/hooks/useImages";

interface FormData {
  name: string;
  slug: string;
  description: string;
  image: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Category;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CategoryForm({ mode, initialData, onSubmit, onCancel, isLoading }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    image: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const { uploadImageAsync, uploading } = useImages();

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description ?? "",
        image: initialData.image ?? "",
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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);
    try {
      const uploaded = await uploadImageAsync({ file });
      setFormData((prev) => ({ ...prev, image: uploaded.url }));
    } catch (err: any) {
      setImageUploadError(err?.message || "Failed to upload image");
    }
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
            placeholder="e.g. adventure-tours"
            value={formData.slug}
            onChange={handleSlugChange}
            className={inputClass(!!errors.slug)}
          />
        </Field>

        <Field label="Image (optional)" error={imageUploadError || undefined}>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {uploading && (
              <p className="text-xs text-slate-500">Uploading image...</p>
            )}
            {formData.image && (
              <div className="flex items-center gap-3">
                <img
                  src={formData.image}
                  alt="Category preview"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Image URL stored in database:</p>
                  <input
                    type="text"
                    value={formData.image}
                    readOnly
                    className={inputClass(false) + " text-xs text-slate-500 bg-slate-50 cursor-not-allowed"}
                  />
                </div>
              </div>
            )}
          </div>
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
            disabled={isLoading || uploading}
            className="py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2 w-[150px]"
          >
            {(isLoading || uploading) && <SpinnerIcon />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}