"use client";

import SpinnerIcon from "@/components/assets/dashboard/SpinnerIcon";
import { Field, inputClass } from "@/components/common/InputForm";
import { useCategories } from "@/utils/hooks/useCategories";
import { useImages } from "@/utils/hooks/useImages";
import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { Destination, DestinationFormData } from "@/utils/service/destination.service";

interface DestinationFormProps {
  mode: "create" | "edit";
  initialData?: Destination;
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
  const { data: categories = [] } = useCategories();
  const { uploadImageAsync } = useImages();

  const [formData, setFormData] = useState<DestinationFormData>({
    title: "",
    description: "",
    price: "",
    categoryId: 0,
    slug: "",
    images: [],
    contents: [],
    locations: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DestinationFormData, string>>>({});
  const [imageUploadProgress, setImageUploadProgress] = useState<Record<number, { progress: number; uploading: boolean }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        price: String(initialData.price ?? ""),
        categoryId: typeof initialData.categoryId === "string" ? parseInt(initialData.categoryId, 10) : initialData.categoryId,
        slug: initialData.slug || "",
        images: initialData.images.map((img, index) => ({
          id: img.id,
          url: img.url,
          key: img.key,
          altText: img.altText || "",
          isMain: img.isMain,
          order: img.order || index,
        })),
        contents: initialData.contents.map((content, contentIndex) => ({
          id: content.id,
          title: content.title,
          subTitle: content.subTitle || "",
          description: content.description,
          dateAvailable: content.dateAvailable
            ? moment(content.dateAvailable).format("YYYY-MM-DD")
            : new Date().toISOString().split("T")[0],
          isAvailable: content.isAvailable,
          images: content?.images?.map((img, imgIndex) => ({
            id: img.id,
            url: img.url,
            key: img.key,
            altText: img.altText || "",
            isMain: img.isMain,
            order: img.order || imgIndex,
          })),
        })),
        locations: initialData.locations.map((location, locationIndex) => ({
          id: location.id,
          title: location.title,
          description: location.description || "",
          hrefLink: location.hrefLink || "",
          images: location?.images?.map((img, imgIndex) => ({
            id: img.id,
            url: img.url,
            key: img.key,
            altText: img.altText || "",
            isMain: img.isMain,
            order: img.order || imgIndex,
          })),
        })),
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof DestinationFormData, string>> = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";

    const numericPrice = parseFloat(formData.price);
    if (!formData.price || isNaN(numericPrice) || numericPrice <= 0) newErrors.price = "Price must be greater than 0";

    if (!formData.categoryId || formData.categoryId <= 0) newErrors.categoryId = "Please select a category";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof DestinationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === "categoryId" ? parseInt(value, 10) || 0 : value,
    }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
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

  const addContent = () => {
    setFormData(prev => ({
      ...prev,
      contents: [
        ...prev.contents,
        {
          title: "",
          subTitle: "",
          description: "",
          dateAvailable: new Date().toISOString().split('T')[0],
          isAvailable: true,
          images: [],
        },
      ],
    }));
  };

  const removeContent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contents: prev.contents.filter((_, i) => i !== index),
    }));
  };

  const updateContent = (index: number, field: string, value: any) => {
    const updatedContents = [...formData.contents];
    updatedContents[index] = { ...updatedContents[index], [field]: value };
    setFormData(prev => ({ ...prev, contents: updatedContents }));
  };

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          title: "",
          description: "",
          hrefLink: "",
          images: [],
        },
      ],
    }));
  };

  const removeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const updateLocation = (index: number, field: string, value: any) => {
    const updatedLocations = [...formData.locations];
    updatedLocations[index] = { ...updatedLocations[index], [field]: value };
    setFormData(prev => ({ ...prev, locations: updatedLocations }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      ...formData,
      price: String(formData.price),
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

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" error={errors.title} required>
            <input
              type="text"
              value={formData.title}
              placeholder="Destination title..."
              onChange={handleChange("title")}
              className={inputClass(!!errors.title)}
            />
          </Field>

          <Field label="Slug" error={errors.slug}>
            <input
              type="text"
              value={formData.slug || ""}
              placeholder="destination-slug (optional)"
              onChange={handleChange("slug")}
              className={inputClass(!!errors.slug)}
            />
          </Field>
        </div>

        <Field label="Description" error={errors.description} required>
          <textarea
            rows={4}
            value={formData.description}
            placeholder="Detailed description of the destination..."
            onChange={handleChange("description")}
            className={`${inputClass(!!errors.description)} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Price (USD)" error={errors.price} required>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
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

        {/* Images Section */}
        <div className="border-t border-slate-200 pt-6">
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

        {/* Contents Section */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Contents</h3>
            <button
              type="button"
              onClick={addContent}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Add Content
            </button>
          </div>
          
          {formData.contents.map((content, contentIndex) => (
            <div key={contentIndex} className="border border-slate-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-800">Content {contentIndex + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeContent(contentIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Field label="Title" required>
                  <input
                    type="text"
                    value={content.title}
                    onChange={(e) => updateContent(contentIndex, 'title', e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>
                <Field label="Sub Title">
                  <input
                    type="text"
                    value={content.subTitle || ""}
                    onChange={(e) => updateContent(contentIndex, 'subTitle', e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Field label="Date Available" required>
                  <input
                    type="date"
                    value={content.dateAvailable}
                    onChange={(e) => updateContent(contentIndex, 'dateAvailable', e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>
                <Field label="Available">
                  <select
                    value={content.isAvailable ? 'true' : 'false'}
                    onChange={(e) => updateContent(contentIndex, 'isAvailable', e.target.value === 'true')}
                    className={inputClass(false)}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </Field>
              </div>
              
              <Field label="Description" required>
                <textarea
                  rows={3}
                  value={content.description}
                  onChange={(e) => updateContent(contentIndex, 'description', e.target.value)}
                  className={`${inputClass(false)} resize-none`}
                />
              </Field>
            </div>
          ))}
        </div>

        {/* Locations Section */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Locations</h3>
            <button
              type="button"
              onClick={addLocation}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Add Location
            </button>
          </div>
          
          {formData.locations.map((location, locationIndex) => (
            <div key={locationIndex} className="border border-slate-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-800">Location {locationIndex + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeLocation(locationIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Field label="Title" required>
                  <input
                    type="text"
                    value={location.title}
                    onChange={(e) => updateLocation(locationIndex, 'title', e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>
                <Field label="Description">
                  <input
                    type="text"
                    value={location.description || ""}
                    onChange={(e) => updateLocation(locationIndex, 'description', e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>
              </div>
              
              <Field label="Link URL">
                <input
                  type="url"
                  value={location.hrefLink || ""}
                  onChange={(e) => updateLocation(locationIndex, 'hrefLink', e.target.value)}
                  placeholder="https://..."
                  className={inputClass(false)}
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2 w-[150px]"
          >
            {isLoading && <SpinnerIcon />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}