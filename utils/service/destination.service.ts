import axios from "axios";

export interface Destination {
  id: number;
  title: string;
  description: string;
  price: number | string;
  categoryId: number;
  slug?: string;
  images: any[];
  contents: any[];
  locations: any[];
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

export const destinationService = {
  getAll: async () => {
    const { data } = await axios.get("/api/destinations");
    return data;
  },

  create: async (payload: DestinationFormData) => {
    const { data } = await axios.post("/api/destinations", payload);
    return data;
  },

  update: async (id: number | string, payload: DestinationFormData) => {
    const { data } = await axios.put(`/api/destinations/${id}`, payload);
    return data;
  },

  delete: async (id: number | string) => {
    const { data } = await axios.delete(`/api/destinations/${id}`);
    return data;
  },
};
