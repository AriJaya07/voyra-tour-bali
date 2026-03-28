import type {
  ViatorHoldResponse,
  ViatorPaymentAccount,
  ViatorConfirmResponse,
} from "@/types/bookingFlow";

/**
 * Mock implementations for the Viator checkout flow.
 * Used when VIATOR_MOCK_BOOKING="true" — no real API calls are made.
 *
 * Each mock simulates realistic latency and returns plausible data.
 */

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function mockHoldBooking(): Promise<ViatorHoldResponse> {
  await delay(800);

  return {
    sessionToken: "mock_session_" + Date.now(),
    expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: "HELD",
  };
}

export async function mockGetPaymentMethods(): Promise<ViatorPaymentAccount[]> {
  await delay(500);

  return [
    { id: "mock_card", type: "CARD", label: "Credit Card", currencyCode: "USD" },
    { id: "mock_paypal", type: "PAYPAL", label: "PayPal", currencyCode: "USD" },
    { id: "mock_bank", type: "BANK_TRANSFER", label: "Bank Transfer", currencyCode: "USD" },
  ];
}

export async function mockConfirmBooking(): Promise<ViatorConfirmResponse> {
  await delay(1000);

  return {
    bookingRef: "MOCK-" + Math.floor(Math.random() * 1000000),
    status: "CONFIRMED",
    voucherInfo: {
      url: "https://viator.com/voucher?id=mock-voucher",
    },
  };
}
