import api from "@/lib/axios";
import type {
  TourcmsAvailabilityResult,
  TourcmsBookingOptions,
  TourcmsListResult,
  TourcmsPaxMixEntry,
  TourcmsProductDetail,
} from "@/types/tourcms";

export interface TourcmsListFilters {
  q?: string;
  categoryId?: number;
  channelId?: number;
  page?: number;
  pageSize?: number;
}

export interface StartTourcmsBookingDto {
  productCode: string;
  componentKey: string;
  productOptionCode?: string;
  productTitle: string;
  productImage?: string;
  travelDate: string;
  travelTime?: string;
  paxMix: TourcmsPaxMixEntry[];
  totalPriceSource: number;
  currencySource: string;
  travelers: { firstName: string; lastName: string; ageBand: string }[];
  leadFirstName: string;
  leadLastName: string;
  leadEmail: string;
  leadPhone: string;
  meetingPoint?: string;
  idempotencyKey?: string;
}

export interface StartTourcmsBookingResponse {
  bookingId: number;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  totalPriceIdr: number;
  fxRateToIdr: number;
}

export const tourcmsService = {
  list: async (filters: TourcmsListFilters): Promise<TourcmsListResult> => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.channelId) params.set("channelId", String(filters.channelId));
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    return (await api.get(`/tourcms/products?${params.toString()}`)).data;
  },

  detail: async (productCode: string): Promise<TourcmsProductDetail> => {
    return (
      await api.get(`/tourcms/product/${encodeURIComponent(productCode)}`)
    ).data;
  },

  availability: async (input: {
    productCode: string;
    travelDate: string;
    paxMix: TourcmsPaxMixEntry[];
  }): Promise<TourcmsAvailabilityResult> => {
    return (await api.post("/tourcms/availability", input)).data;
  },

  bookingOptions: async (input: {
    productCode: string;
    travelDate: string;
    paxMix: TourcmsPaxMixEntry[];
  }): Promise<TourcmsBookingOptions> => {
    return (await api.post("/tourcms/booking-options", input)).data;
  },

  startBooking: async (
    input: StartTourcmsBookingDto
  ): Promise<StartTourcmsBookingResponse> => {
    return (await api.post("/tourcms/bookings/start", input)).data;
  },

  getBooking: async (id: number) => {
    return (await api.get(`/tourcms/bookings/${id}`)).data;
  },

  cancelBooking: async (input: { bookingId: number; reason?: string }) => {
    return (await api.post("/tourcms/bookings/cancel", input)).data;
  },
};
