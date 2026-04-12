/**
 * Payment Gateway Configuration
 *
 * Switch between payment gateways via NEXT_PUBLIC_PAYMENT_GATEWAY env var.
 * Supported values: "mayar" | "midtrans"
 */

export type PaymentGatewayType = "mayar" | "midtrans";

export const ACTIVE_GATEWAY: PaymentGatewayType =
  (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY as PaymentGatewayType) || "midtrans";

export const isMayar = () => ACTIVE_GATEWAY === "mayar";
export const isMidtrans = () => ACTIVE_GATEWAY === "midtrans";

// Mayar configuration (server-side only)
export const MAYAR_API_KEY = process.env.MAYAR_API_KEY || "";
export const MAYAR_API_URL = process.env.MAYAR_API_URL || "";
