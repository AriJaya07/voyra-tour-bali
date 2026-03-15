"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";

// ── Types ────────────────────────────────────────────────────────────
export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  pricing: { summary: { fromPrice: number } };
  images: { variants: { url: string }[] }[];
}

interface ViatorBookingPayload {
  productCode: string;
  productTitle: string;
  travelDate: string;
  pax: number;
  totalPrice: number;
}

interface ViatorBookingResponse {
  status: string;
  bookingRef?: string;
  orderId?: string;
}

// ── Hook: Fetch Viator products by category ──────────────────────────
export function useViatorProducts(categoryId: number | null) {
  return useQuery<ViatorProduct[]>({
    queryKey: ["viator-products", categoryId],
    queryFn: async () => {
      const { data } = await api.get("/viator", {
        params: { action: "products", categoryId },
      });
      return data?.data ?? [];
    },
    enabled: categoryId !== null,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// ── Hook: Viator booking mutation ────────────────────────────────────
export function useViatorBooking() {
  return useMutation<ViatorBookingResponse, Error, ViatorBookingPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ViatorBookingResponse>(
        "/viator?action=book",
        payload
      );
      return data;
    },
  });
}
