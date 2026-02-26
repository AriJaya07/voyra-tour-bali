const BASE = "/api/packages";

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
  description: string;
  price: number;
  categoryId: number | null;
  destinationId: number | null;
  category: PackageCategory | null;
  destination: PackageDestination | null;
  images?: { id: number; url: string }[];
  _count?: { images: number };
  createdAt: string;
  updatedAt: string;
}

export interface PackagePayload {
  title: string;
  description: string;
  price: number | string;
  categoryId?: number | string | null;
  destinationId?: number | string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export const packageService = {
  getAll: (): Promise<Package[]> =>
    fetch(BASE).then((r) => handleResponse<Package[]>(r)),

  getOne: (id: number): Promise<Package> =>
    fetch(`${BASE}/${id}`).then((r) => handleResponse<Package>(r)),

  create: (payload: PackagePayload): Promise<Package> =>
    fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Package>(r)),

  update: (id: number, payload: Partial<PackagePayload>): Promise<Package> =>
    fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Package>(r)),

  delete: (id: number): Promise<{ success: boolean }> =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then((r) =>
      handleResponse<{ success: boolean }>(r)
    ),
};