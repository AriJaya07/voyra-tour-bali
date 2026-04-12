/**
 * Payment Gateway Abstraction Layer
 *
 * Provides a unified interface for creating payment transactions,
 * regardless of the underlying gateway (Midtrans or Mayar).
 */

import { ACTIVE_GATEWAY } from "@/lib/config/payment";
import { MidtransGateway } from "./midtransGateway";
import { MayarGateway } from "./mayarGateway";

export interface CreateTransactionParams {
  orderId: string;
  grossAmount: number;
  itemDetails: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
  customerDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  callbackUrls: {
    success: string;
    pending: string;
    error: string;
  };
}

export interface PaymentGatewayResult {
  /** Midtrans Snap token (null for Mayar) */
  token: string | null;
  /** Payment page URL (Mayar payment link or Midtrans redirect_url) */
  redirectUrl: string | null;
}

export interface PaymentGateway {
  createTransaction(params: CreateTransactionParams): Promise<PaymentGatewayResult>;
}

/**
 * Factory function to get the active payment gateway instance.
 */
export function getPaymentGateway(): PaymentGateway {
  switch (ACTIVE_GATEWAY) {
    case "mayar":
      return new MayarGateway();
    case "midtrans":
    default:
      return new MidtransGateway();
  }
}
