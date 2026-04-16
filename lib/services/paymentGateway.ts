/**
 * Payment Gateway Abstraction Layer
 *
 * Provides a unified interface for creating payment transactions via Midtrans.
 */

import { MidtransGateway } from "./midtransGateway";

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
  /** Midtrans Snap token */
  token: string | null;
  /** Midtrans redirect URL (fallback when Snap is unavailable) */
  redirectUrl: string | null;
}

export interface PaymentGateway {
  createTransaction(params: CreateTransactionParams): Promise<PaymentGatewayResult>;
}

/**
 * Returns the active payment gateway instance (Midtrans).
 */
export function getPaymentGateway(): PaymentGateway {
  return new MidtransGateway();
}
