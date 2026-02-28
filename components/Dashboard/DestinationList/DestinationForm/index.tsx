"use client";

import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";
import { Field, inputClass } from "@/components/common/InputForm";
import { useCategories } from "@/utils/hooks/useCategories";
import { useState, useEffect } from "react";

interface DestinationFormData {
  title: string;
  description: string;
  price: string;
  categoryId: number;
}

interface DestinationFormProps {
  mode: "create" | "edit";
  initialData?: {
    title: string;
    description: string;
    price: number | string;
    categoryId: string | number;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    price: number;
    categoryId: number;
  }) => void;
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
  const { data: categories = [] } = useCategories();

  const [formData, setFormData] = useState<DestinationFormData>({
    title: "",
    description: "",
    price: "", 
    categoryId: 0,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof DestinationFormData, string>>
  >({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        price: String(initialData.price ?? ""),
        categoryId:
          typeof initialData.categoryId === "string"
            ? parseInt(initialData.categoryId, 10)
            : initialData.categoryId,
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Partial<
      Record<keyof DestinationFormData, string>
    > = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";

    const numericPrice = parseFloat(formData.price);
    if (!formData.price || isNaN(numericPrice) || numericPrice <= 0)
      newErrors.price = "Price must be greater than 0";

    if (!formData.categoryId || formData.categoryId <= 0)
      newErrors.categoryId = "Please select a category";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange =
    (field: keyof DestinationFormData) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      const value = e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]:
          field === "categoryId"
            ? parseInt(value, 10) || 0
            : value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      ...formData,
      price: parseFloat(formData.price), 
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
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
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        <Field label="Title" error={errors.title} required>
          <input
            type="text"
            value={formData.title}
            onChange={handleChange("title")}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field label="Description" error={errors.description} required>
          <textarea
            rows={3}
            value={formData.description}
            onChange={handleChange("description")}
            className={`${inputClass(!!errors.description)} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" error={errors.price} required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange("price")}
              className={inputClass(!!errors.price)}
            />
          </Field>

          <Field label="Category" error={errors.categoryId} required>
            <select
              value={formData.categoryId}
              onChange={handleChange("categoryId")}
              className={inputClass(!!errors.categoryId)}
            >
              <option value={0}>— Select Category —</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2 w-[150px]"
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