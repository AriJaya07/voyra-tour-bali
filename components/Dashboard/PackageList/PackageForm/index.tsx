"use client";

import { useState, useEffect, useRef } from "react";
import { Package } from "@/utils/service/package.service";
import { useCategories } from "@/utils/hooks/useCategories";
import { useDestinations } from "@/utils/hooks/useDestinations";
import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";
import { Field, inputClass } from "@/components/common/InputForm";
import { useImages } from "@/utils/hooks/useImages";

interface FormData {
  title: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  destinationId: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImageAsync } = useImages();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: "",
    description: "",
    price: "",
    categoryId: "",
    destinationId: "",
    images: [],
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        slug: initialData.slug,
        description: initialData.description,
        price: String(initialData.price),
        categoryId: initialData.categoryId ? String(initialData.categoryId) : "",
        destinationId: initialData.destinationId ? String(initialData.destinationId) : "",
        images: initialData.images.map((img, index) => ({
          id: img.id,
          url: img.url,
          key: img.key,
          altText: img.altText || "",
          isMain: img.isMain,
          order: img.order || index,
        })),
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.slug.trim()) e.description = "Slug is required";
    if (!formData.price || Number(formData.price) <= 0) e.price = "Price must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!fileArray.length) return;

    const newImages = [...formData.images];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Add temporary image entry
      newImages.push({
        url: URL.createObjectURL(file),
        key: "",
        altText: "",
        isMain: newImages.length === 0,
        order: newImages.length,
      });
      
      setFormData(prev => ({ ...prev, images: newImages }));

      try {
        const result = await uploadImageAsync({ file });
        
        // Update the image with the actual data
        const updatedImages = [...newImages];
        const imageIndex = updatedImages.length - fileArray.length + i;
        updatedImages[imageIndex] = {
          ...updatedImages[imageIndex],
          id: Number(result.id),
          url: result.url,
          key: result.key,
        };
        
        setFormData(prev => ({ ...prev, images: updatedImages }));
      } catch (error) {
        console.error("Failed to upload image:", error);
        // Remove the failed image
        newImages.pop();
        setFormData(prev => ({ ...prev, images: newImages }));
      }
    }
  };

  const handleImageDelete = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const handleImageAltTextChange = (index: number, altText: string) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = { ...updatedImages[index], altText };
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const handleSetMainImage = (index: number) => {
    const updatedImages = formData.images.map((img, i) => ({
      ...img,
      isMain: i === index,
    }));
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

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

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <Field label="Title" error={errors.title} required>
          <input
            type="text" 
            placeholder="e.g. 7-Day Bali Explorer" 
            value={formData.title} 
            onChange={handleChange("title")}
            className={inputClass(!!errors.title)}
          />
        </Field>

        <Field label="Slug" error={errors.slug} required>
          <input
            type="text" 
            placeholder="Slug..." 
            value={formData.slug} 
            onChange={handleChange("slug")}
            className={inputClass(!!errors.slug)}
          />
        </Field>

        <Field label="Description" error={errors.description} required>
           <textarea 
            placeholder="Describe what's included in this package..." 
            value={formData.description} 
            onChange={handleChange("description")} 
            rows={3}
            className={inputClass(!!errors.description)}
          />
        </Field>

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

        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Destination" error={errors.destinationId} required>
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
        </div>
        
        <div className="border-b border-slate-200 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Images</h3>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Upload Images
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetMainImage(index)}
                      className={`px-2 py-1 text-xs rounded ${
                        image.isMain ? 'bg-green-500 text-white' : 'bg-white text-slate-800'
                      }`}
                    >
                      {image.isMain ? 'Main' : 'Set Main'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageDelete(index)}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Alt text"
                  value={image.altText || ""}
                  onChange={(e) => handleImageAltTextChange(index, e.target.value)}
                  className="mt-2 w-full text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>
            ))}
          </div>
        </div>

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