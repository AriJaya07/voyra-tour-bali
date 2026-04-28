import api from "@/lib/axios";

export interface BookingUser {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
}

export type BookingProvider = "LOCAL" | "VIATOR" | "TOURCMS";

export interface Booking {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
  productOptionCode?: string | null;
  productOptionTitle?: string | null;
  productImage: string | null;
  totalPrice: number;
  travelDate: string;
  travelTime: string | null;
  pax: number;
  status: "PENDING" | "PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  paymentId: string | null;
  snapToken: string | null;
  paidAt: string | null;
  userId: number;
  user?: BookingUser;
  ticketImageUrl: string | null;
  paymentProofUrl: string | null;
  languageGuide: string | null;
  isMockMode: boolean;
  manualPrice: number | null;
  promoCode: string | null;
  createdAt: string;
  updatedAt: string;

  // Unified-table additions
  provider: BookingProvider;
  _src: "booking" | "tourcms";

  // TourCMS-only fields (present when _src === "tourcms")
  tourcmsBookingRef?: string | null;
  tourcmsBookingStatus?: string | null;
  tourcmsCommitError?: string | null;
  tourcmsRetryCount?: number;
  tourcmsVoucherUrl?: string | null;
  ticketToken?: string | null;
  leadEmail?: string | null;
  channelId?: number;
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
  provider?: "ALL" | BookingProvider;
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

  updateStatus: async (
    id: number,
    status: string,
    payload?: { manualPrice?: number; travelTime?: string; provider?: BookingProvider }
  ): Promise<Booking> => {
    if (payload?.provider === "TOURCMS") {
      const { data } = await api.patch(`/tourcms/bookings/${id}`, { status });
      return data;
    }
    const { provider: _ignored, ...rest } = payload || {};
    void _ignored;
    const { data } = await api.patch(`/admin/bookings/${id}`, { status, ...rest });
    return data;
  },

  retryTourcmsCommit: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const { data } = await api.post(`/admin/tourcms-bookings/${id}/retry-commit`);
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

  uploadPaymentProof: async (id: number, file: File): Promise<{ success: boolean; paymentProofUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/admin/bookings/${id}/payment-proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
