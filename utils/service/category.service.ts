import api from "@/lib/axios"; // adjust path if needed

const BASE = "/categories";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { destinations: number; packages: number };
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>(BASE);
    return data;
  },

  getOne: async (id: number): Promise<Category> => {
    const { data } = await api.get<Category>(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: CategoryPayload): Promise<Category> => {
    const { data } = await api.post<Category>(BASE, payload);
    return data;
  },

  update: async (
    id: number,
    payload: Partial<CategoryPayload>
  ): Promise<Category> => {
    const { data } = await api.put<Category>(`${BASE}/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(
      `${BASE}/${id}`
    );
    return data;
  },
};