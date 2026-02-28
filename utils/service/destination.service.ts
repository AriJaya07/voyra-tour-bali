import axios from "axios";

export interface Destination {
  id: string;
  title: string;
  description: string;
  price: number | string;
  categoryId: string | number;
}

export const destinationService = {
  getAll: async () => {
    const { data } = await axios.get("/api/destinations");
    return data;
  },

  create: async (payload: any) => {
    const { data } = await axios.post("/api/destinations", payload);
    return data;
  },

  update: async (id: string, payload: any) => {
    const { data } = await axios.put(`/api/destinations/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await axios.delete(`/api/destinations/${id}`);
    return data;
  },
};