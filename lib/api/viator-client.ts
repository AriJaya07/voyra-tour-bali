export async function checkAvailability(params: {
  productCode: string;
  productOptionCode?: string;
  travelDate: string;
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  currency: string;
}) {
  const res = await fetch("/api/viator/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchBookingQuestions(productCode: string) {
  const res = await fetch(
    `/api/viator/booking-questions?productCode=${productCode}`
  );
  return res.json();
}

export async function createBooking(params: {
  productCode: string;
  productOptionCode?: string;
  travelDate: string;
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  bookerInfo: { firstName: string; lastName: string };
  communication: { email: string; phone: string };
  travelers?: Array<{
    ageBand: string;
    firstName: string;
    lastName: string;
  }>;
  bookingQuestions?: Array<{ questionId: string; answer: string }>;
  leadTraveler?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}) {
  const res = await fetch("/api/viator/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchCancelQuote(bookingRef: string) {
  const res = await fetch(
    `/api/viator/cancel-quote?bookingRef=${bookingRef}`
  );
  return res.json();
}

export async function cancelBooking(bookingRef: string) {
  const res = await fetch("/api/viator/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingRef, reasonCode: "CUSTOMER_REQUEST" }),
  });
  return res.json();
}

export async function updateBookingStatus(
  bookingRef: string,
  status: string
) {
  const res = await fetch("/api/bookings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingRef, status }),
  });
  return res.json();
}

export async function retryFailedBookings() {
  const res = await fetch("/api/bookings/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}
