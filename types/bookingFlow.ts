/**
 * Shared types for the booking flow.
 *
 * Two sources:
 *   VIATOR → redirect to external Viator URL (no internal payment)
 *   LOCAL  → Midtrans payment (fully handled internally)
 */

// ── Product Source ─────────────────────────────────────────────────

export type ProductSource = "VIATOR" | "LOCAL";

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  source: ProductSource;
  viatorUrl?: string;
  image?: string;
  productCode?: string;
  productOptionCode?: string;
}

// ── Booking Service I/O ────────────────────────────────────────────

export interface BookingInput {
  productCode: string;
  productTitle: string;
  productImage?: string;
  productOptionCode?: string;
  travelDate: string;
  startTime?: string;
  tourGradeCode?: string;
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  travelers: Array<{
    ageBand: string;
    firstName: string;
    lastName: string;
  }>;
  leadTraveler: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  totalPrice: number;
  currency: string;
  meetingPoint?: string;
  languageGuide?: string;
  bookingQuestionAnswers?: Array<{ questionId: string; answer: string }>;
}

export type BookingResultType = "redirect" | "payment";

export interface BookingResult {
  type: BookingResultType;
  success: boolean;
  bookingRef?: string;
  redirectUrl?: string;
  snapToken?: string;
  orderId?: string;
  error?: string;
}

// ── Viator API Types (used by API routes and mock layer) ───────────

export interface ViatorHoldResponse {
  paymentDataSubmissionUrl?: string; // v2.0 preferred
  paymentSessionToken?: string;
  sessionToken?: string; // fallback/legacy
  expiration?: string;
  status?: string;
  cartReference?: string;
}

export interface ViatorPaymentAccount {
  id: string;
  type: string;
  label?: string;
  currencyCode?: string;
}

export interface ViatorConfirmInput {
  cartReference: string;
  paymentToken: string;
  items: any[];
}

export interface ViatorConfirmResponse {
  bookingRef: string;
  status: string;
  voucherInfo?: {
    url: string;
  };
}

// ── Viator checkout step tracking ──────────────────────────────────

export type ViatorFlowStep =
  | "idle"
  | "holding"
  | "held"
  | "payment_iframe" // Using iframe for VIATOR_FORM
  | "confirming"
  | "confirmed"
  | "expired"
  | "error";
