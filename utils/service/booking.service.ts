import api from "@/lib/axios";

export interface BookingUser {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Booking {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
  totalPrice: number;
  travelDate: string;
  pax: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  paymentId: string | null;
  snapToken: string | null;
  paidAt: string | null;
  userId: number;
  user?: BookingUser;
  ticketImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BookingFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const bookingService = {
  getAll: async (filters?: BookingFilters): Promise<BookingsResponse> => {
    const { data } = await api.get("/admin/bookings", { params: filters });
    return data;
  },

  getOne: async (id: number): Promise<Booking> => {
    const { data } = await api.get(`/admin/bookings/${id}`);
    return data;
  },

  updateStatus: async (id: number, status: string): Promise<Booking> => {
    const { data } = await api.patch(`/admin/bookings/${id}`, { status });
    return data;
  },

  uploadTicket: async (id: number, file: File): Promise<{ success: boolean; ticketImageUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/admin/bookings/${id}/ticket`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
