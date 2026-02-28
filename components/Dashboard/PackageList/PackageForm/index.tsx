"use client";

import { useState, useEffect } from "react";
import { Package } from "@/utils/service/package.service";
import { useCategories } from "@/utils/hooks/useCategories";
import { useDestinations } from "@/utils/hooks/useDestinations";
import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";

interface FormData {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  destinationId: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Package;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PackageForm({ mode, initialData, onSubmit, onCancel, isLoading }: Props) {
  const { data: categories } = useCategories();
  const { data: destinations } = useDestinations();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    categoryId: "",
    destinationId: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        price: String(initialData.price),
        categoryId: initialData.categoryId ? String(initialData.categoryId) : "",
        destinationId: initialData.destinationId ? String(initialData.destinationId) : "",
      });
    }
  }, [initialData]);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.price || Number(formData.price) <= 0) e.price = "Price must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors ${
      err ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
    }`;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {mode === "create" ? "New Entry" : "Editing"}
          </p>
          <h2 className="text-xl font-bold text-white">
            {mode === "create" ? "Create Package" : "Update Package"}
          </h2>
        </div>
        <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input type="text" placeholder="e.g. 7-Day Bali Explorer" value={formData.title} onChange={set("title")} className={inputCls(errors.title)} />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea placeholder="Describe what's included in this package..." value={formData.description} onChange={set("description")} rows={3} className={`${inputCls(errors.description)} resize-none`} />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Price (USD) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
            <input type="number" placeholder="0.00" min="0" step="0.01" value={formData.price} onChange={set("price")} className={`${inputCls(errors.price)} pl-7`} />
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>

        {/* Category + Destination */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Category <span className="text-slate-300 font-normal normal-case">(optional)</span>
            </label>
            <select value={formData.categoryId} onChange={set("categoryId")} className={inputCls()}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Destination <span className="text-slate-300 font-normal normal-case">(optional)</span>
            </label>
            <select value={formData.destinationId} onChange={set("destinationId")} className={inputCls()}>
              <option value="">— None —</option>
              {destinations.map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2 w-[150px]"
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