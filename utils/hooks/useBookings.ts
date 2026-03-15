"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService, BookingFilters } from "../service/booking.service";

export function useBookings(filters?: BookingFilters) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-bookings", filters],
    queryFn: () => bookingService.getAll(filters),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      bookingService.updateStatus(id, status),
    onSuccess: invalidate,
  });

  return {
    bookings: data?.bookings ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isError,
    updateStatus: updateStatusMutation.mutate,
    updatingStatus: updateStatusMutation.isPending,
  };
}
