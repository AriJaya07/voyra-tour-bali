import api from "@/lib/axios";

const BASE = "/locations";

export interface Location {
  id: number;
  title: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
  hrefLink: string | null;
  description: string | null;
  destinationId: number;
  destination: { id: number; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface LocationPayload {
  title: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
  hrefLink?: string;
  description?: string;
  destinationId: number | string;
}

export const locationService = {
  getAll: async (destinationId?: number): Promise<Location[]> => {
    const { data } = await api.get<Location[]>(BASE, {
      params: destinationId ? { destinationId } : {},
    });
    return data;
  },

  getOne: async (id: number): Promise<Location> => {
    const { data } = await api.get<Location>(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: LocationPayload): Promise<Location> => {
    const { data } = await api.post<Location>(BASE, payload);
    return data;
  },

  update: async (
    id: number,
    payload: Partial<LocationPayload>
  ): Promise<Location> => {
    const { data } = await api.put<Location>(`${BASE}/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(`${BASE}/${id}`);
    return data;
  },
};
