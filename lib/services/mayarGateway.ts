/**
 * Mayar Payment Gateway Implementation
 *
 * Creates payment invoices via Mayar API.
 * Users are redirected to Mayar's hosted payment page.
 * Mayar sends a webhook callback when payment status changes.
 */

import { MAYAR_API_KEY, MAYAR_API_URL } from "@/lib/config/payment";
import type { PaymentGateway, CreateTransactionParams, PaymentGatewayResult } from "./paymentGateway";

export class MayarGateway implements PaymentGateway {
  async createTransaction(params: CreateTransactionParams): Promise<PaymentGatewayResult> {
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.balitravelnow.com";

    const payload = {
      name: `${params.customerDetails.firstName} ${params.customerDetails.lastName}`.trim() || "Guest",
      email: params.customerDetails.email,
      phone: params.customerDetails.phone || "",
      amount: params.grossAmount,
      description: params.itemDetails.map((item) => item.name).join(", "),
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      redirectUrl: `${baseUrl}/payment/success?order_id=${params.orderId}&transaction_status=settlement`,
      callbackUrl: `${baseUrl}/api/payment/notification/mayar`,
    };

    const response = await fetch(`${MAYAR_API_URL}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAYAR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Mayar API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      token: null,
      redirectUrl: data.data?.link || null,
    };
  }
}
