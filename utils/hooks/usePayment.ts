"use client";

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";

interface PaymentPayload {
  productCode: string;
  productTitle: string;
  travelDate: string;
  pax: number;
  totalPrice: number;
}

interface PaymentResponse {
  bookingId: number;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
}

export function useCreatePayment() {
  return useMutation<PaymentResponse, Error, PaymentPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<PaymentResponse>("/payment", payload);
      return data;
    },
  });
}
