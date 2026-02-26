const BASE = "/api/categories";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { destinations: number; packages: number };
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export const categoryService = {
  getAll: (): Promise<Category[]> =>
    fetch(BASE).then((r) => handleResponse<Category[]>(r)),

  getOne: (id: number): Promise<Category> =>
    fetch(`${BASE}/${id}`).then((r) => handleResponse<Category>(r)),

  create: (payload: CategoryPayload): Promise<Category> =>
    fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Category>(r)),

  update: (id: number, payload: Partial<CategoryPayload>): Promise<Category> =>
    fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Category>(r)),

  delete: (id: number): Promise<{ success: boolean }> =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then((r) =>
      handleResponse<{ success: boolean }>(r)
    ),
};