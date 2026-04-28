import type { UserProfile } from "@/types/profile";
import type { Booking } from "@/types/booking";

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(data: { name: string; phone: string | null }): Promise<UserProfile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return res.json();
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/profile/upload-avatar", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function fetchUserBookings(): Promise<Booking[]> {
  const res = await fetch("/api/bookings");
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}

interface RawTourcmsBooking {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
  productImage: string | null;
  totalPrice: number;
  currency: string;
  travelDate: string;
  travelTime: string | null;
  pax: number;
  status: Booking["status"];
  paidAt: string | null;
  paymentId: string | null;
  snapToken: string | null;
  ticketToken: string | null;
  meetingPoint: string | null;
  travelers?: { fullName: string; ageBand: string }[];
  createdAt: string;
}

function adaptTourcmsToBooking(t: RawTourcmsBooking): Booking {
  return {
    id: t.id,
    bookingRef: t.bookingRef,
    productCode: t.productCode,
    productTitle: t.productTitle,
    productImage: t.productImage || undefined,
    totalPrice: t.totalPrice,
    currency: t.currency,
    travelDate: t.travelDate,
    travelTime: t.travelTime || undefined,
    pax: t.pax,
    status: t.status,
    createdAt: t.createdAt,
    paymentId: t.paymentId || undefined,
    snapToken: t.snapToken || undefined,
    ticketToken: t.ticketToken || undefined,
    meetingPoint: t.meetingPoint || undefined,
    travelers: t.travelers,
    paidAt: t.paidAt || undefined,
    provider: "TOURCMS",
    _src: "tourcms",
  };
}

export async function fetchAllUserBookings(): Promise<Booking[]> {
  const [localRes, tcRes] = await Promise.allSettled([
    fetch("/api/bookings").then((r) => (r.ok ? r.json() : [])),
    fetch("/api/tourcms/my-bookings").then((r) => (r.ok ? r.json() : [])),
  ]);

  const local: Booking[] =
    localRes.status === "fulfilled"
      ? (localRes.value as Booking[]).map((b) => ({
          ...b,
          provider:
            b.provider ||
            (/^[A-Z0-9]+P\d+$/i.test(b.productCode) ? "VIATOR" : "LOCAL"),
          _src: "booking",
        }))
      : [];

  const tcms: Booking[] =
    tcRes.status === "fulfilled"
      ? (tcRes.value as RawTourcmsBooking[]).map(adaptTourcmsToBooking)
      : [];

  return [...local, ...tcms].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
