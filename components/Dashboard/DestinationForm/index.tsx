"use client";

import { useState, useEffect } from "react";

interface DestinationFormData {
  title: string;
  description: string;
  price: string;
  categoryId: string;
}

interface DestinationFormProps {
  mode: "create" | "edit";
  initialData?: {
    title: string;
    description: string;
    price: number | string;
    categoryId: string | number;
  };
  onSubmit: (data: DestinationFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function DestinationForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: DestinationFormProps) {
  const [formData, setFormData] = useState<DestinationFormData>({
    title: "",
    description: "",
    price: "",
    categoryId: "",
  });
  const [errors, setErrors] = useState<Partial<DestinationFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        price: String(initialData.price),
        categoryId: String(initialData.categoryId),
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Partial<DestinationFormData> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = "Price must be greater than 0";
    if (!formData.categoryId) newErrors.categoryId = "Category ID is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange =
    (field: keyof DestinationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">
              {mode === "create" ? "New Entry" : "Editing"}
            </p>
            <h2 className="text-xl font-bold text-white">
              {mode === "create" ? "Add Destination" : "Update Destination"}
            </h2>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        {/* Title */}
        <Field label="Title" error={errors.title} required>
          <input
            type="text"
            placeholder="e.g. Bali, Indonesia"
            value={formData.title}
            onChange={handleChange("title")}
            className={inputClass(!!errors.title)}
          />
        </Field>

        {/* Description */}
        <Field label="Description" error={errors.description} required>
          <textarea
            placeholder="Describe what makes this destination special..."
            value={formData.description}
            onChange={handleChange("description")}
            rows={3}
            className={`${inputClass(!!errors.description)} resize-none`}
          />
        </Field>

        {/* Price & Category */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" error={errors.price} required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange("price")}
                className={`${inputClass(!!errors.price)} pl-7`}
              />
            </div>
          </Field>

          <Field label="Category ID" error={errors.categoryId} required>
            <input
              type="number"
              placeholder="e.g. 1"
              min="1"
              value={formData.categoryId}
              onChange={handleChange("categoryId")}
              className={inputClass(!!errors.categoryId)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === "create" ? "Create Destination" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helpers
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    hasError
      ? "border-red-300 bg-red-50 focus:ring-red-400"
      : "border-slate-200 focus:border-blue-400"
  }`;
}