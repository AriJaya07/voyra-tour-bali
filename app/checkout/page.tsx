import { Suspense } from 'react';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 flex items-center justify-center text-[#0071CE] font-bold">Loading Checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
