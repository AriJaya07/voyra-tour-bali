import { Suspense } from "react";
import PaymentPendingContent from "@/components/payment/PaymentPendingContent";

export default function PaymentPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      }
    >
      <PaymentPendingContent />
    </Suspense>
  );
}
