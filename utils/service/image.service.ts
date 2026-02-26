export interface ImageItem {
    id: number;
    url: string;
    destinationId: number | null;
    packageId: number | null;
    createdAt: string;
    destination: { id: number; title: string } | null;
    package: { id: number; title: string } | null;
  }
  
  export interface UploadImagePayload {
    file: File;
    destinationId?: string;
    packageId?: string;
  }
  
  async function handleResponse<T>(res: Response): Promise<T> {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }
  
  export const imageService = {
    getAll: (params?: { destinationId?: number; packageId?: number }): Promise<ImageItem[]> => {
      const query = new URLSearchParams();
      if (params?.destinationId) query.set("destinationId", String(params.destinationId));
      if (params?.packageId) query.set("packageId", String(params.packageId));
      return fetch(`/api/images?${query}`).then((r) => handleResponse<ImageItem[]>(r));
    },
  
    upload: async (payload: UploadImagePayload): Promise<ImageItem> => {
      const form = new FormData();
      form.append("file", payload.file);
      if (payload.destinationId) form.append("destinationId", payload.destinationId);
      if (payload.packageId) form.append("packageId", payload.packageId);
  
      const res = await fetch("/api/images", { method: "POST", body: form });
      return handleResponse<ImageItem>(res);
    },
  
    update: (id: number, payload: { destinationId?: number | null; packageId?: number | null }): Promise<ImageItem> =>
      fetch(`/api/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => handleResponse<ImageItem>(r)),
  
    delete: (id: number): Promise<{ success: boolean }> =>
      fetch(`/api/images/${id}`, { method: "DELETE" }).then((r) =>
        handleResponse<{ success: boolean }>(r)
      ),
  };