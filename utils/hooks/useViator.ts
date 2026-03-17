"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";

// ── Types matching Viator API v2 response ─────────────────────────────
export interface ViatorImageVariant {
  height: number;
  width: number;
  url: string;
}

export interface ViatorImage {
  imageSource?: string;
  caption?: string;
  isCover?: boolean;
  variants: ViatorImageVariant[];
}

export interface ViatorReviewSource {
  provider: string;
  totalCount: number;
  averageRating: number;
}

export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  pricing: {
    summary: { fromPrice: number };
    currency: string;
  };
  images: ViatorImage[];
  reviews?: {
    sources?: ViatorReviewSource[];
    totalReviews: number;
    combinedAverageRating: number;
  };
  duration?: {
    fixedDurationInMinutes?: number;
    variableDurationFromMinutes?: number;
    variableDurationToMinutes?: number;
  };
  flags?: string[];
  confirmationType?: string;
  productUrl?: string;
  destinations?: { ref: string; primary?: boolean }[];
  tags?: number[];
  itinerary?: any;
  inclusions?: any[];
  exclusions?: any[];
  additionalInfo?: string[];
  bookingConfirmationSettings?: { confirmationType: string };
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

// ── Helper: get best image URL from variants ──────────────────────────
export function getViatorImageUrl(
  images: ViatorImage[] | undefined,
  preferredWidth: number = 720
): string {
  if (!images || images.length === 0) return "/images/activity/melasti.png";

  // Prefer cover image
  const coverImg = images.find((img) => img.isCover) || images[0];
  const variants = coverImg?.variants;
  if (!variants || variants.length === 0) return "/images/activity/melasti.png";

  // Find the variant closest to preferred width
  const sorted = [...variants].sort(
    (a, b) =>
      Math.abs(a.width - preferredWidth) - Math.abs(b.width - preferredWidth)
  );
  return sorted[0].url;
}

// ── Helper: format duration ───────────────────────────────────────────
export function formatDuration(duration?: ViatorProduct["duration"]): string {
  if (!duration) return "";
  const mins =
    duration.fixedDurationInMinutes || duration.variableDurationFromMinutes || 0;
  if (mins === 0) return "";
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// ── Hook: Fetch Viator products (Bali) ────────────────────────────────
export function useViatorProducts(
  categoryName: string | null,
  currency: string = "USD"
) {
  return useQuery<ViatorProduct[]>({
    queryKey: ["viator-products", categoryName, currency],
    queryFn: async () => {
      const { data } = await api.get("/viator", {
        params: { action: "products", categoryName, currency },
      });
      return data?.products ?? [];
    },
    enabled: !!categoryName,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// ── Hook: Fetch single Viator product detail ──────────────────────────
export function useViatorProductDetail(
  productCode: string | null,
  currency: string = "USD"
) {
  return useQuery<ViatorProduct>({
    queryKey: ["viator-product-detail", productCode, currency],
    queryFn: async () => {
      const { data } = await api.get("/viator", {
        params: { action: "product_detail", productCode, currency },
      });
      return data;
    },
    enabled: !!productCode,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

// ── Hook: Viator booking mutation ─────────────────────────────────────
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
