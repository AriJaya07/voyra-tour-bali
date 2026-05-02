export interface ToolkitNextEvent {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  location: string | null;
}

export interface ToolkitNextTrip {
  id: number;
  productTitle: string;
  travelDate: string | null;
  productImage: string | null;
}

export interface ToolkitData {
  authed: boolean;
  unreadInbox: number;
  upcomingEvents: number;
  nextEvent: ToolkitNextEvent | null;
  nextTrip: ToolkitNextTrip | null;
  wishlistCount: number;
  notesCount: number;
  itineraryCount: number;
  loyaltyPoints: number;
  loyaltyTier?: string | null;
  aiCreditsRemaining?: number;
  aiPlan?: "FREE" | "EXPLORER" | "VOYAGER" | "FOUNDER";
}

export const EMPTY_TOOLKIT: ToolkitData = {
  authed: false,
  unreadInbox: 0,
  upcomingEvents: 0,
  nextEvent: null,
  nextTrip: null,
  wishlistCount: 0,
  notesCount: 0,
  itineraryCount: 0,
  loyaltyPoints: 0,
  loyaltyTier: null,
  aiCreditsRemaining: 0,
  aiPlan: "FREE",
};
