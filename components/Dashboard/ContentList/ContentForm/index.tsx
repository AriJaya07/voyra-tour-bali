"use client";

import { useState, useEffect } from "react";
import { Content } from "@/utils/service/content.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { useImages } from "@/utils/hooks/useImages";

interface FormData {
  title: string;
  subTitle: string;
  description: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
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
  const { uploadImageAsync } = useImages();

  const empty: FormData = {
    title: "", subTitle: "", description: "",
    images: [],
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
        images: [],
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
    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.destinationId) e.destinationId = "Destination is required";
    if (!formData.dateAvailable) e.dateAvailable = "Date is required";
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
    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {mode === "create" ? "New Entry" : "Editing"}
          </p>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            {mode === "create" ? "Add Content" : "Edit Content"}
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
            Destination <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.destinationId}
            onChange={set("destinationId")}
            disabled={!!preselectedDestinationId}
            className={inputCls(!!errors.destinationId)}
          >
            <option value="">— Select Destination —</option>
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
              placeholder="Content title"
              value={formData.title}
              onChange={set("title")}
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Sub Title <span className="text-slate-600 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Content subtitle"
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
            placeholder="Full content description..."
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
              Date Available <span className="text-red-400">*</span>
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
                  {formData.isAvailable ? "Available" : "Unavailable"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Images */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
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
            {mode === "create" ? "Add Content" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}