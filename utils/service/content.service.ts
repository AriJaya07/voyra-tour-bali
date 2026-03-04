import api from "@/lib/axios";


export interface Content {
  id: number;
  title: string;
  subTitle: string | null;
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
  destinationId: number;
  destination: { id: number; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface ContentPayload {
  title: string;
  subTitle?: string;
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
  isAvailable?: boolean;
  destinationId: number | string;
}

export const contentService = {
  getAll: (destinationId?: number): Promise<Content[]> =>
    api.get("/contents", {
      params: destinationId ? { destinationId } : undefined,
    }).then((r) => r.data),

  getOne: (id: number): Promise<Content> =>
    api.get(`/contents/${id}`).then((r) => r.data),

  create: (payload: ContentPayload): Promise<Content> =>
    api.post("/contents", payload).then((r) => r.data),

  update: (id: number, payload: Partial<ContentPayload>): Promise<Content> =>
    api.put(`/contents/${id}`, payload).then((r) => r.data),

  delete: (id: number): Promise<{ success: boolean }> =>
    api.delete(`/contents/${id}`).then((r) => r.data),
};