import api from "@/lib/axios"; // adjust path if needed

export interface DestinationImage {
  id?: number;
  url: string;
  key: string;
  altText?: string;
  isMain: boolean;
  order: number;
}

export interface Destination {
  id: number;
  title: string;
  description: string;
  price: number;
  categoryId: number;
  slug?: string;
  category?: { id: number; name: string; slug: string } | null;
  images: DestinationImage[];
  contents: Array<{
    id: number;
    title: string;
    subTitle?: string | null;
    description: string;
    dateAvailable: string;
    isAvailable: boolean;
    images: DestinationImage[];
  }>;
  locations: Array<{
    id: number;
    title: string;
    description?: string | null;
    hrefLink?: string | null;
    images: DestinationImage[];
  }>;
  _count?: { images: number };
  createdAt: string;
  updatedAt: string;
}

export interface DestinationFormData {
  title: string;
  description: string;
  price: string;
  categoryId: number;
  slug?: string;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
  contents: Array<{
    id?: number;
    title: string;
    subTitle?: string;
    description: string;
    dateAvailable: string;
    isAvailable: boolean;
    images: Array<{
      id?: number;
      url: string;
      key: string;
      altText?: string;
      isMain: boolean;
      order: number;
    }>;
  }>;
  locations: Array<{
    id?: number;
    title: string;
    description?: string;
    hrefLink?: string;
    images: Array<{
      id?: number;
      url: string;
      key: string;
      altText?: string;
      isMain: boolean;
      order: number;
    }>;
  }>;
}

const BASE = "/destinations";

export const destinationService = {
  getAll: async (): Promise<Destination[]> => {
    const { data } = await api.get<Destination[]>(BASE);
    return data;
  },

  getByCategory: async (categoryId: number | string): Promise<Destination[]> => {
    const { data } = await api.get<Destination[]>(BASE, {
      params: { categoryId },
    });
    return data;
  },

  getOne: async (id: number | string): Promise<Destination> => {
    const { data } = await api.get<Destination>(`${BASE}/${id}`);
    return data;
  },

  create: async (
    payload: DestinationFormData
  ): Promise<Destination> => {
    const { data } = await api.post<Destination>(BASE, payload);
    return data;
  },

  update: async (
    id: number | string,
    payload: DestinationFormData
  ): Promise<Destination> => {
    const { data } = await api.put<Destination>(
      `${BASE}/${id}`,
      payload
    );
    return data;
  },

  delete: async (
    id: number | string
  ): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(
      `${BASE}/${id}`
    );
    return data;
  },
};