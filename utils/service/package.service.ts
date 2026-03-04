import api from "@/lib/axios";

const BASE = "/packages";


export interface PackageCategory {
  id: number;
  name: string;
  slug: string;
}

export interface PackageDestination {
  id: number;
  title: string;
}

export interface Package {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  categoryId: number | null;
  destinationId: number | null;
  category: PackageCategory | null;
  destination: PackageDestination | null;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
  _count?: { images: number };
  createdAt: string;
  updatedAt: string;
}

export interface PackagePayload {
  title: string;
  slug: string;
  description: string;
  price: number | string;
  categoryId?: number | string | null;
  destinationId?: number | string | null;
  images: Array<{
    id?: number;
    url: string;
    key: string;
    altText?: string;
    isMain: boolean;
    order: number;
  }>;
}

function normalizePayload(
  payload: PackagePayload | Partial<PackagePayload>
) {
  return {
    ...payload,
    price:
      payload.price !== undefined
        ? Number(payload.price)
        : undefined,
    categoryId:
      payload.categoryId !== undefined && payload.categoryId !== null
        ? Number(payload.categoryId)
        : null,
    destinationId:
      payload.destinationId !== undefined &&
      payload.destinationId !== null
        ? Number(payload.destinationId)
        : null,
  };
}

export const packageService = {
  /* Get All */
  async getAll(): Promise<Package[]> {
    const { data } = await api.get<Package[]>(BASE);
    return data;
  },

  /* Get One */
  async getOne(id: number): Promise<Package> {
    const { data } = await api.get<Package>(`${BASE}/${id}`);
    return data;
  },

  /* Create */
  async create(payload: PackagePayload): Promise<Package> {
    const { data } = await api.post<Package>(
      BASE,
      normalizePayload(payload)
    );
    return data;
  },

  /* Update */
  async update(
    id: number,
    payload: Partial<PackagePayload>
  ): Promise<Package> {
    const { data } = await api.patch<Package>(
      `${BASE}/${id}`,
      normalizePayload(payload)
    );
    return data;
  },

  /* Delete */
  async delete(id: number): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(
      `${BASE}/${id}`
    );
    return data;
  },
};