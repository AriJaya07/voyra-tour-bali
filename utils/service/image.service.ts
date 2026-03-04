import api from "@/lib/axios";

export interface ImageItem {
  id: number;
  url: string;
  key: string;
  altText?: string | null;
  isMain: boolean;
  order?: number | null;
  destinationId: number | null;
  packageId: number | null;
  contentId: number | null;
  locationId: number | null;
  createdAt: string;
  destination: { id: number; title: string } | null;
  package: { id: number; title: string } | null;
  content?: { id: number; title: string } | null;
  location?: { id: number; title: string } | null;
}

export interface UploadImagePayload {
  file: File;
  destinationId?: string;
  packageId?: string;
  contentId?: string;
  locationId?: string;
}

const BASE = "/images";

export const imageService = {

  getAll: async (params?: {
    destinationId?: number;
    packageId?: number;
    contentId?: number;
    locationId?: number;
  }): Promise<ImageItem[]> => {
    const { data } = await api.get<ImageItem[]>(BASE, {
      params,
    });

    return data;
  },

  upload: async (
    payload: UploadImagePayload
  ): Promise<ImageItem> => {
    const form = new FormData();
    form.append("file", payload.file);

    if (payload.destinationId)
      form.append("destinationId", payload.destinationId);
    if (payload.packageId)
      form.append("packageId", payload.packageId);
    if (payload.contentId)
      form.append("contentId", payload.contentId);
    if (payload.locationId)
      form.append("locationId", payload.locationId);

    const { data } = await api.post<ImageItem>(BASE, form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  update: async (
    id: number,
    payload: {
      destinationId?: number | null;
      packageId?: number | null;
      contentId?: number | null;
      locationId?: number | null;
      altText?: string | null;
      isMain?: boolean;
      order?: number | null;
    }
  ): Promise<ImageItem> => {
    const { data } = await api.patch<ImageItem>(
      `${BASE}/${id}`,
      payload
    );

    return data;
  },

  delete: async (
    id: number
  ): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(
      `${BASE}/${id}`
    );

    return data;
  },
};