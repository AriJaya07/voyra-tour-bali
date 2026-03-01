import axios from "axios";

const BASE = "/api/locations";

export interface Location {
  id: number;
  title: string;
  image: string | null;
  hrefLink: string | null;
  description: string | null;
  destinationId: number;
  destination: { id: number; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface LocationPayload {
  title: string;
  image?: string;
  hrefLink?: string;
  description?: string;
  destinationId: number | string;
}

const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

function handleAxiosError(error: any): never {
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error.message ||
    "Request failed";

  throw new Error(message);
}

export const locationService = {
  getAll: async (destinationId?: number): Promise<Location[]> => {
    try {
      const res = await api.get<Location[]>(BASE, {
        params: destinationId ? { destinationId } : {},
      });
      console.log(res, "PPPPOX");

      return res.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  getOne: async (id: number): Promise<Location> => {
    try {
      const res = await api.get<Location>(`${BASE}/${id}`);
      return res.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  create: async (payload: LocationPayload): Promise<Location> => {
    try {
      const res = await api.post<Location>(BASE, payload);
      return res.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  update: async (
    id: number,
    payload: Partial<LocationPayload>
  ): Promise<Location> => {
    try {
      const res = await api.patch<Location>(`${BASE}/${id}`, payload);
      return res.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    try {
      const res = await api.delete<{ success: boolean }>(
        `${BASE}/${id}`
      );
      return res.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },
};