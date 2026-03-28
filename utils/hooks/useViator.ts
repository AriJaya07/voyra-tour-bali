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

export interface ViatorAgeBand {
  ageBand: "ADULT" | "CHILD" | "INFANT" | "YOUTH" | "SENIOR" | "TRAVELER";
  startAge: number;
  endAge: number;
  count?: number;
  price?: number;
}

export interface ViatorPricingInfo {
  type?: "PER_PERSON" | "PER_GROUP" | string;
  ageBands?: ViatorAgeBand[];
}

export interface ViatorLogisticsLocation {
  location: { ref: string };
  description?: string;
  pickupType?: string;
}

export interface ViatorLogistics {
  start?: ViatorLogisticsLocation[];
  end?: ViatorLogisticsLocation[];
  redemption?: {
    redemptionType?: string;
    specialInstructions?: string;
  };
  travelerPickup?: {
    pickupOptionType?: string;
    allowCustomTravelerPickup?: boolean;
    locations?: ViatorLogisticsLocation[];
    additionalInfo?: string;
  };
}

export interface ViatorCancellationPolicy {
  type: string;
  description: string;
  cancelIfBadWeather?: boolean;
  cancelIfInsufficientTravelers?: boolean;
  refundEligibility?: Array<{
    dayRangeMin: number;
    dayRangeMax?: number;
    percentageRefundable: number;
  }>;
}

export interface ViatorBookingRequirements {
  minTravelersPerBooking?: number;
  maxTravelersPerBooking?: number;
  requiresAdultForBooking?: boolean;
}

export interface ViatorLanguageGuide {
  type: string;
  language: string;
  legacyGuide?: string;
}

export interface ViatorItineraryItem {
  pointOfInterestLocation?: {
    location: { ref: string };
    attractionId?: number;
  };
  duration?: {
    fixedDurationInMinutes?: number;
  };
  passByWithoutStopping?: boolean;
  admissionIncluded?: string;
  description?: string;
}

export interface ViatorItinerary {
  itineraryType?: string;
  skipTheLine?: boolean;
  privateTour?: boolean;
  duration?: {
    fixedDurationInMinutes?: number;
    variableDurationFromMinutes?: number;
    variableDurationToMinutes?: number;
  };
  itineraryItems?: ViatorItineraryItem[];
}

export interface ViatorProductOption {
  productOptionCode: string;
  title: string;
  description: string;
  languageGuides?: ViatorLanguageGuide[];
}

export interface ViatorSupplier {
  name: string;
  reference?: string;
}

export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  pricing: {
    summary: { fromPrice: number };
    currency: string;
  };
  pricingInfo?: ViatorPricingInfo;
  images: ViatorImage[];
  reviews?: {
    sources?: ViatorReviewSource[];
    totalReviews: number;
    combinedAverageRating?: number;
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
  itinerary?: ViatorItinerary;
  inclusions?: any[];
  exclusions?: any[];
  additionalInfo?: string[];
  bookingConfirmationSettings?: {
    confirmationType: string;
    bookingCutoffType?: string;
    bookingCutoffInMinutes?: number;
    bookingCutoffFixedTime?: string;
  };
  logistics?: ViatorLogistics;
  timeZone?: string;
  cancellationPolicy?: ViatorCancellationPolicy;
  bookingRequirements?: ViatorBookingRequirements;
  languageGuides?: ViatorLanguageGuide[];
  bookingQuestions?: string[];
  productOptions?: ViatorProductOption[];
  supplier?: ViatorSupplier;
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

// ── Paginated response shape ────────────────────────────────────────
export interface ViatorPaginatedResponse {
  products: ViatorProduct[];
  totalCount: number;
  page: number;
  count: number;
  hasMore: boolean;
}

// ── Hook: Fetch Viator products by tag IDs (Bali) — paginated ───────
export function useViatorProducts(
  tagIds: number[] | null,
  currency: string = "USD",
  page: number = 1,
  count: number = 50
) {
  return useQuery<ViatorPaginatedResponse>({
    queryKey: ["viator-products", tagIds, currency, page, count],
    queryFn: async () => {
      const { data } = await api.get("/viator", {
        params: {
          action: "products",
          tagIds: tagIds ? JSON.stringify(tagIds) : undefined,
          currency,
          page,
          count,
        },
      });
      return {
        products: data?.products ?? [],
        totalCount: data?.totalCount ?? 0,
        page: data?.page ?? page,
        count: data?.count ?? count,
        hasMore: data?.hasMore ?? false,
      };
    },
    enabled: !!tagIds && tagIds.length > 0,
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

// ── Hook: Search Viator products (freetext) — paginated ─────────────
export function useViatorSearch(
  query: string,
  currency: string = "USD",
  page: number = 1,
  count: number = 20
) {
  return useQuery<ViatorPaginatedResponse>({
    queryKey: ["viator-search", query, currency, page, count],
    queryFn: async () => {
      if (!query.trim()) {
        const { data } = await api.get("/viator", {
          params: { action: "products", currency, page, count },
        });
        return {
          products: data?.products ?? [],
          totalCount: data?.totalCount ?? 0,
          page: data?.page ?? page,
          count: data?.count ?? count,
          hasMore: data?.hasMore ?? false,
        };
      }
      const { data } = await api.get("/viator", {
        params: { action: "search", query, currency, page, count },
      });
      return {
        products: data?.products ?? [],
        totalCount: data?.totalCount ?? 0,
        page: data?.page ?? page,
        count: data?.count ?? count,
        hasMore: data?.hasMore ?? false,
      };
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// ── Availability types ───────────────────────────────────────────────
export interface AvailabilityPaxMix {
  ageBand: string;
  numberOfTravelers: number;
}

export interface AvailabilityPricingDetail {
  ageBand: string;
  price: {
    original: {
      recommendedRetailPrice: number;
      partnerNetPrice?: number;
    };
  };
  minTravelers?: number;
  maxTravelers?: number;
}

export interface AvailabilityResponse {
  available?: boolean;
  bookableItems?: Array<{
    itemCode?: string;
    totalPrice?: {
      price: {
        recommendedRetailPrice: number;
      };
    };
    seasons?: Array<{
      pricingRecords?: Array<{
        pricingDetails?: AvailabilityPricingDetail[];
      }>;
    }>;
  }>;
}

// ── Hook: Fetch availability + real pricing from Viator ──────────────
export function useViatorAvailability(
  productCode: string | undefined,
  travelDate: string | null,
  paxMix: AvailabilityPaxMix[],
  currency: string = "USD"
) {
  const hasTravelers = paxMix.some((p) => p.numberOfTravelers > 0);
  const enabled = !!productCode && !!travelDate && hasTravelers;

  // Stable key from paxMix
  const paxKey = paxMix
    .filter((p) => p.numberOfTravelers > 0)
    .map((p) => `${p.ageBand}:${p.numberOfTravelers}`)
    .join(",");

  return useQuery<AvailabilityResponse>({
    queryKey: ["viator-availability", productCode, travelDate, paxKey, currency],
    queryFn: async () => {
      const { data } = await api.post<AvailabilityResponse>(
        "/viator?action=availability",
        {
          productCode,
          travelDate,
          currency,
          paxMix: paxMix.filter((p) => p.numberOfTravelers > 0),
        }
      );
      return data;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Extract per-ageBand price map from availability response.
 * Returns { ADULT: 500000, CHILD: 250000, ... }
 */
export function extractPriceMap(
  data: AvailabilityResponse | undefined
): Record<string, number> {
  const map: Record<string, number> = {};
  if (!data?.bookableItems?.length) return map;

  const item = data.bookableItems[0];

  // Try nested seasons → pricingRecords → pricingDetails
  const pricingDetails =
    item?.seasons?.[0]?.pricingRecords?.[0]?.pricingDetails;

  if (pricingDetails && pricingDetails.length > 0) {
    for (const detail of pricingDetails) {
      map[detail.ageBand] =
        detail.price?.original?.recommendedRetailPrice ?? 0;
    }
    return map;
  }

  // Fallback: flat totalPrice on bookableItem (mock data shape)
  if (item?.totalPrice?.price?.recommendedRetailPrice) {
    map["_TOTAL"] = item.totalPrice.price.recommendedRetailPrice;
  }

  return map;
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
