"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  aiService,
  type AiCostEndpoint,
  type AiPackKey,
  type AiPlanKey,
} from "@/utils/service/ai.service";

export const AI_QUERY_KEYS = {
  wallet: ["ai", "wallet"] as const,
  catalog: ["ai", "catalog"] as const,
  subscription: ["ai", "subscription"] as const,
  usage: (range: string) => ["ai", "usage", range] as const,
};

export function useAiWallet(opts?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.wallet,
    queryFn: aiService.getWallet,
    enabled: opts?.enabled ?? true,
    refetchInterval: opts?.refetchInterval,
    staleTime: 15_000,
  });
}

export function useAiCatalog() {
  return useQuery({
    queryKey: AI_QUERY_KEYS.catalog,
    queryFn: aiService.getCatalog,
    staleTime: 5 * 60_000,
  });
}

export function useAiUsage(range: "7d" | "30d" | "90d" = "30d", enabled = true) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.usage(range),
    queryFn: () => aiService.getUsage(range),
    enabled,
    staleTime: 30_000,
  });
}

export function useAiTopupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pack: AiPackKey) => aiService.buyTopup(pack),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet }),
  });
}

export function useAiSubscription(enabled = true) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.subscription,
    queryFn: aiService.getSubscription,
    enabled,
    staleTime: 30_000,
  });
}

export function useStartSubscriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: AiPlanKey) => aiService.startSubscription(plan),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.subscription });
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
    },
  });
}

export function useChangeSubscriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: AiPlanKey) => aiService.changeSubscription(plan),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.subscription });
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
    },
  });
}

export function useCancelSubscriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiService.cancelSubscription,
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.subscription }),
  });
}

export function useResumeSubscriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiService.resumeSubscription,
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.subscription }),
  });
}

export const AI_CONCIERGE_KEY = ["ai", "concierge", "memory"] as const;

export function useConciergeMemory(enabled = true) {
  return useQuery({
    queryKey: AI_CONCIERGE_KEY,
    queryFn: aiService.conciergeMemory,
    enabled,
    staleTime: 60_000,
  });
}

export function useConciergeAskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (msg: string) => aiService.conciergeAsk(msg),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AI_CONCIERGE_KEY });
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
    },
  });
}

export function useConciergeForgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiService.conciergeForget,
    onSettled: () => qc.invalidateQueries({ queryKey: AI_CONCIERGE_KEY }),
  });
}

export function useItineraryBookMutation() {
  return useMutation({
    mutationFn: ({ itineraryId, dayFilter }: { itineraryId: number; dayFilter?: number }) =>
      aiService.bookItinerary(itineraryId, dayFilter),
  });
}

export function usePlanRefineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { itineraryId: number; day: number; instruction: string }) =>
      aiService.refinePlan(params),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet }),
  });
}

export function useCulturalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userMessage, date }: { userMessage: string; date?: string }) =>
      aiService.culturalAsk(userMessage, date),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet }),
  });
}

export function useDayOfTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { userMessage: string; region?: string; weather?: string }) =>
      aiService.dayOfTripAsk(params),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet }),
  });
}

export function useVoucherReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, opts }: { file: File; opts?: { addToTrips?: boolean; addToCalendar?: boolean } }) =>
      aiService.voucherRead(file, opts),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet }),
  });
}

export function useLoyaltyRedeemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (points: number) => aiService.redeemLoyalty(points),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
      qc.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });
}

export const AI_FAMILY_KEY = ["ai", "family-seats"] as const;

export function useFamilySeats(enabled = true) {
  return useQuery({
    queryKey: AI_FAMILY_KEY,
    queryFn: aiService.listFamilySeats,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useInviteFamilySeatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => aiService.inviteFamilySeat(email),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_FAMILY_KEY }),
  });
}

export function useRevokeFamilySeatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => aiService.revokeFamilySeat(id),
    onSettled: () => qc.invalidateQueries({ queryKey: AI_FAMILY_KEY }),
  });
}

export function useAcceptFamilySeatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => aiService.acceptFamilySeat(token),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
      qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.subscription });
    },
  });
}

export function useEstimateCost(
  endpoint: AiCostEndpoint,
  params?: { days?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ["ai", "estimate", endpoint, params?.days ?? null],
    queryFn: () => aiService.estimateCost(endpoint, params),
    enabled,
    staleTime: 10_000,
  });
}
