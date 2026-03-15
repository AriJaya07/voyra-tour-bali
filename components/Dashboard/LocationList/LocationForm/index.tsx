"use client";

import { useState, useEffect, useRef } from "react";
import { Location } from "@/utils/service/location.service";
import { useDestinations } from "@/utils/hooks/useDestinations";
import { Field, inputClass } from "@/components/common/InputForm";
import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import LinkIcon from "@/components/assets/dashboard/LinkIcon";
import { useImages } from "@/utils/hooks/useImages";

interface FormData {
  title: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
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

  const { uploadImageAsync } = useImages();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    images: [],
    hrefLink: "",
    description: "",
    destinationId: preselectedDestinationId ? String(preselectedDestinationId) : "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        images: initialData.images.map((img, index) => ({
          id: img.id,
          url: img.url,
          key: img.key,
          altText: img.altText || "",
          isMain: img.isMain,
          order: img.order || index,
        })),
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
    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.destinationId) e.destinationId = "Destination is required";
    if (formData.hrefLink && !/^https?:\/\//i.test(formData.hrefLink)) {
      e.hrefLink = "Link must start with http:// or https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
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
            {mode === "create" ? "Add Location" : "Edit Location"}
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
            placeholder="Brief description about this location..."
            value={formData.description}
            onChange={handleChange("description")}
            className={inputClass(!!errors.description)}
          />
        </Field>

        <div className="border-b border-slate-200">
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
            className="py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center w-[150px]"
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === "create" ? "Add Location" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}