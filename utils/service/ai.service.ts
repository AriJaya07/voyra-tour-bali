import api from "@/lib/axios";

export type AiPlanKey = "FREE" | "EXPLORER" | "VOYAGER" | "FOUNDER";
export type AiPackKey = "STARTER" | "STANDARD" | "BIG" | "MEGA";

export interface AiPlanFeatures {
  plan: boolean;
  planMaxDays: number;
  saveItineraries: number;
  concierge: boolean;
  dayOfTrip: boolean;
  cultural: boolean;
  voucherRead: boolean;
  familySeats: number;
  priorityRouting: boolean;
}

export interface AiPlan {
  key: AiPlanKey;
  label: string;
  priceIdr: number;
  monthlyCredits: number;
  carryoverDays: number;
  carryoverCap: number;
  features: AiPlanFeatures;
}

export interface AiPack {
  key: AiPackKey;
  label: string;
  priceIdr: number;
  credits: number;
  expiryDays: number;
}

export interface AiCatalog {
  plans: AiPlan[];
  packs: AiPack[];
}

export interface AiGrantSummary {
  id: number;
  source: string;
  amount: number;
  remaining: number;
  grantedAt: string;
  expiresAt: string;
}

export interface AiSubscriptionDTO {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  nextRenewalAt: string | null;
}

export interface AiWalletDTO {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  expiringIn7d: number;
  plan: AiPlanKey;
  planLabel: string;
  planFeatures: AiPlanFeatures;
  subscription: AiSubscriptionDTO | null;
  grants: AiGrantSummary[];
}

export interface AiUsageRow {
  id: number;
  endpoint: string;
  creditsCost: number;
  tokensIn: number | null;
  tokensOut: number | null;
  status: string;
  durationMs: number | null;
  createdAt: string;
}

export interface AiLedgerRow {
  id: number;
  delta: number;
  reason: string;
  reservationStatus: string | null;
  createdAt: string;
}

export interface AiUsageDTO {
  range: string;
  since: string;
  usage: AiUsageRow[];
  ledger: AiLedgerRow[];
  totals: { endpoint: string; calls: number; creditsSpent: number }[];
}

export interface AiTopupResponse {
  paymentId: string;
  snapToken: string | null;
  redirectUrl: string | null;
  amountIdr: number;
  pack: AiPackKey;
}

export interface AiSubscriptionPaymentResponse {
  paymentId: string;
  snapToken: string | null;
  redirectUrl: string | null;
  amountIdr: number;
  plan: AiPlanKey;
  /** Set when PATCH defers a downgrade. */
  deferred?: boolean;
  /** Pro-rated bonus credits granted on upgrade payment success. */
  proratedCredits?: number;
  daysLeft?: number;
}

export interface AiSubscriptionRowDTO {
  id: number;
  userId: number;
  plan: AiPlanKey;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  pendingPlanKey: AiPlanKey | null;
  failedRenewals: number;
  priceIdr: number;
  monthlyCredits: number;
}

export const aiService = {
  getWallet: async (): Promise<AiWalletDTO> => {
    const { data } = await api.get("/ai/wallet");
    return data;
  },

  getCatalog: async (): Promise<AiCatalog> => {
    const { data } = await api.get("/ai/plans");
    return data;
  },

  getUsage: async (range: "7d" | "30d" | "90d" = "30d"): Promise<AiUsageDTO> => {
    const { data } = await api.get(`/ai/usage`, { params: { range } });
    return data;
  },

  buyTopup: async (pack: AiPackKey): Promise<AiTopupResponse> => {
    const { data } = await api.post("/ai/topup", { pack });
    return data;
  },

  getSubscription: async (): Promise<{ subscription: AiSubscriptionRowDTO | null }> => {
    const { data } = await api.get("/ai/subscription");
    return data;
  },

  startSubscription: async (plan: AiPlanKey): Promise<AiSubscriptionPaymentResponse> => {
    const { data } = await api.post("/ai/subscription", { plan });
    return data;
  },

  changeSubscription: async (
    plan: AiPlanKey
  ): Promise<AiSubscriptionPaymentResponse & { message?: string; nextRenewalAt?: string }> => {
    const { data } = await api.patch("/ai/subscription", { plan });
    return data;
  },

  cancelSubscription: async (): Promise<{ message: string; subscription: AiSubscriptionRowDTO }> => {
    const { data } = await api.post("/ai/subscription/cancel");
    return data;
  },

  resumeSubscription: async (): Promise<{ message: string; subscription: AiSubscriptionRowDTO }> => {
    const { data } = await api.post("/ai/subscription/resume");
    return data;
  },

  conciergeAsk: async (userMessage: string): Promise<AiConciergeResponse> => {
    const { data } = await api.post("/ai/concierge", { userMessage });
    return data;
  },

  conciergeMemory: async (): Promise<AiConciergeMemory> => {
    const { data } = await api.get("/ai/concierge");
    return data;
  },

  conciergeForget: async (): Promise<{ message: string }> => {
    const { data } = await api.delete("/ai/concierge");
    return data;
  },

  bookItinerary: async (itineraryId: number, dayFilter?: number): Promise<AiItineraryBundle> => {
    const { data } = await api.post("/ai/itinerary/book", { itineraryId, dayFilter });
    return data;
  },

  refinePlan: async (params: {
    itineraryId: number;
    day: number;
    instruction: string;
  }): Promise<AiPlanRefineResponse> => {
    const { data } = await api.post("/ai/plan-refine", params);
    return data;
  },

  culturalAsk: async (userMessage: string, date?: string): Promise<AiCulturalResponse> => {
    const { data } = await api.post("/ai/cultural", { userMessage, date });
    return data;
  },

  dayOfTripAsk: async (params: {
    userMessage: string;
    region?: string;
    weather?: string;
  }): Promise<AiDayOfTripResponse> => {
    const { data } = await api.post("/ai/day-of-trip", params);
    return data;
  },

  voucherRead: async (
    file: File,
    opts?: { addToTrips?: boolean; addToCalendar?: boolean }
  ): Promise<AiVoucherReadResponse> => {
    const fd = new FormData();
    fd.append("file", file);
    if (opts?.addToTrips) fd.append("addToTrips", "true");
    if (opts?.addToCalendar) fd.append("addToCalendar", "true");
    const { data } = await api.post("/ai/voucher-read", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  redeemLoyalty: async (points: number): Promise<AiLoyaltyRedeemResponse> => {
    const { data } = await api.post("/ai/loyalty-redeem", { points });
    return data;
  },

  listFamilySeats: async (): Promise<AiFamilySeatsListResponse> => {
    const { data } = await api.get("/ai/family-seats");
    return data;
  },

  inviteFamilySeat: async (email: string): Promise<{ id: number; inviteEmail: string; autoAccepted: boolean }> => {
    const { data } = await api.post("/ai/family-seats", { email });
    return data;
  },

  revokeFamilySeat: async (id: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/ai/family-seats?id=${id}`);
    return data;
  },

  acceptFamilySeat: async (token: string): Promise<{ message: string; seatId: number }> => {
    const { data } = await api.post("/ai/family-seats/accept", { token });
    return data;
  },
};

export interface AiCulturalEvent {
  slug: string;
  name: string;
  type: string;
  date: string;
  endDate: string | null;
  region: string | null;
  impact: string | null;
}

export interface AiCulturalResponse {
  reply: string;
  events: AiCulturalEvent[];
}

export interface AiDayOfTripResponse {
  reply: string;
  free: boolean;
  booking: { id: number; productTitle: string; travelDate: string } | null;
}

export interface AiVoucherExtracted {
  productTitle: string | null;
  productCode: string | null;
  travelDate: string | null;
  travelTime: string | null;
  meetingPoint: string | null;
  pax: number | null;
  leadName: string | null;
  bookingRef: string | null;
  vendor: string | null;
  totalPrice: string | null;
  notes: string | null;
}

export interface AiVoucherReadResponse {
  extracted: AiVoucherExtracted;
  createdImportedTripId: number | null;
  createdCalendarEventId: number | null;
}

export interface AiLoyaltyRedeemResponse {
  pointsRedeemed: number;
  creditsGranted: number;
  newPointsBalance: number;
  expiresInDays: number;
  refId: string;
}

export interface AiFamilySeatRow {
  id: number;
  memberUserId: number | null;
  memberName: string | null;
  memberEmail: string | null;
  inviteEmail: string | null;
  accepted: boolean;
  createdAt: string;
}

export interface AiFamilySeatsListResponse {
  maxSeats: number;
  used: number;
  seats: AiFamilySeatRow[];
}

export interface AiConciergeResponse {
  reply: string;
  remembered: boolean;
  noteAdded: string | null;
  memorySize: number;
}

export interface AiConciergeMemory {
  messages: { role: "user" | "assistant"; content: string; ts: string }[];
  notes: string[];
  turnCount: number;
}

export interface AiItineraryBundleItem {
  day?: number;
  slot?: string;
  productCode: string;
  title: string;
  href: string | null;
  originalPrice: number | null;
  discountedPrice: number | null;
  notes: string;
}

export interface AiPlanRefineItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode: string | null;
  title: string;
  source: "viator" | "tip" | "free";
  notes?: string;
  href?: string | null;
  imageUrl?: string;
  price?: number | null;
  rating?: number | null;
  durationMinutes?: number | null;
}

export interface AiPlanRefineResponse {
  itineraryId: number;
  day: number;
  refinedDay: AiPlanRefineItem[];
  items: AiPlanRefineItem[];
}

export interface AiItineraryBundle {
  itineraryId: number;
  title: string;
  promoCode: string;
  promoDiscount: number;
  bundle: AiItineraryBundleItem[];
  totals: { currency: string; original: number; afterPromo: number; savings: number };
  itemsCount: number;
}
