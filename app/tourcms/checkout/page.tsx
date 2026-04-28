import { Suspense } from "react";

import Container from "@/components/Container";
import TourcmsCheckoutForm from "@/components/tourcms/TourcmsCheckoutForm";

export const metadata = { title: "Checkout — TourCMS · Voyra" };

export default function TourcmsCheckoutPage() {
  return (
    <Container className="">
      <Suspense
        fallback={
          <div className="py-20 text-center text-gray-500">Loading checkout…</div>
        }
      >
        <TourcmsCheckoutForm />
      </Suspense>
    </Container>
  );
}
