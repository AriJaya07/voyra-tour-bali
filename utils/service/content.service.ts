import api from "@/lib/axios";


export interface Content {
  id: number;
  title: string;
  subTitle: string | null;
  description: string;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  imageMain: string | null;
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
  image1?: string;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  imageMain?: string;
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
    api.patch(`/contents/${id}`, payload).then((r) => r.data),

  delete: (id: number): Promise<{ success: boolean }> =>
    api.delete(`/contents/${id}`).then((r) => r.data),
};