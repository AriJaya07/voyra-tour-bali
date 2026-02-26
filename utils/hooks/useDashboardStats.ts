"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../service/dashboard.service";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStats,
    staleTime: 1000 * 60 * 2, // 2 menit cache
    refetchOnWindowFocus: false,
  });
}