/**
 * Midtrans Payment Gateway Implementation
 *
 * Wraps the existing Midtrans Snap client to conform to
 * the PaymentGateway interface.
 */

import { snap } from "@/lib/config/midtrans";
import type { PaymentGateway, CreateTransactionParams, PaymentGatewayResult } from "./paymentGateway";

export class MidtransGateway implements PaymentGateway {
  async createTransaction(params: CreateTransactionParams): Promise<PaymentGatewayResult> {
    const parameter = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      item_details: params.itemDetails,
      customer_details: {
        first_name: params.customerDetails.firstName,
        last_name: params.customerDetails.lastName,
        email: params.customerDetails.email,
        phone: params.customerDetails.phone,
      },
      callbacks: {
        finish: params.callbackUrls.success,
        unfinish: params.callbackUrls.pending,
        error: params.callbackUrls.error,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);

    return {
      token: snapResponse.token,
      redirectUrl: snapResponse.redirect_url,
    };
  }
}
