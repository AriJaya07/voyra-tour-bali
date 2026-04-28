import { Suspense } from "react";

import Container from "@/components/Container";
import TourcmsBookingSuccess from "@/components/tourcms/TourcmsBookingSuccess";

export const metadata = { title: "Booking Confirmed — TourCMS · Voyra" };

export default function TourcmsBookingSuccessPage() {
  return (
    <Container className="">
      <Suspense
        fallback={
          <div className="py-20 text-center text-gray-500">Loading…</div>
        }
      >
        <TourcmsBookingSuccess />
      </Suspense>
    </Container>
  );
}
