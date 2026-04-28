"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  tourcmsService,
  type StartTourcmsBookingDto,
  type TourcmsListFilters,
} from "@/utils/service/tourcms.service";
import type { TourcmsPaxMixEntry } from "@/types/tourcms";

export function useTourcmsProducts(filters: TourcmsListFilters) {
  return useQuery({
    queryKey: ["tourcms", "products", filters],
    queryFn: () => tourcmsService.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTourcmsProduct(productCode: string | null) {
  return useQuery({
    queryKey: ["tourcms", "product", productCode],
    queryFn: () => tourcmsService.detail(productCode as string),
    enabled: !!productCode,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTourcmsAvailability(input: {
  productCode: string | null;
  travelDate: string | null;
  paxMix: TourcmsPaxMixEntry[];
} | null) {
  const enabled =
    !!input && !!input.productCode && !!input.travelDate && input.paxMix.length > 0;
  return useQuery({
    queryKey: [
      "tourcms",
      "availability",
      input?.productCode,
      input?.travelDate,
      input?.paxMix,
    ],
    queryFn: () =>
      tourcmsService.availability({
        productCode: input!.productCode!,
        travelDate: input!.travelDate!,
        paxMix: input!.paxMix,
      }),
    enabled,
  });
}

export function useStartTourcmsBooking() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (input: StartTourcmsBookingDto) => tourcmsService.startBooking(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tourcms", "bookings"] }),
  });
  return {
    startBooking: m.mutateAsync,
    starting: m.isPending,
    error: m.error,
  };
}

export function useTourcmsBooking(id: number | null) {
  return useQuery({
    queryKey: ["tourcms", "bookings", id],
    queryFn: () => tourcmsService.getBooking(id as number),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as { status?: string } | undefined;
      if (!data) return 3000;
      if (["CONFIRMED", "COMPLETED", "CANCELLED"].includes(data.status || "")) {
        return false;
      }
      return 3000;
    },
  });
}

export function useCancelTourcmsBooking() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: tourcmsService.cancelBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tourcms", "bookings"] }),
  });
  return {
    cancelBooking: m.mutate,
    cancelling: m.isPending,
  };
}
