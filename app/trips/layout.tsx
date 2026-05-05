import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config";
import TripsTabs from "@/components/trips/TripsTabs";
import BackLink from "@/components/common/BackLink";

export const metadata: Metadata = {
  title: "My Trips — Plans, bookings, calendar",
  description:
    "Every Bali trip in one place: saved AI itineraries, confirmed bookings, and your trip calendar.",
  alternates: { canonical: `${SITE_URL}/trips` },
  openGraph: {
    title: "My Trips · Voyra",
    description: "Saved plans, bookings, and trip calendar in one hub.",
    url: `${SITE_URL}/trips`,
    type: "website",
  },
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-10">
        <div className="flex flex-row items-center gap-4 mb-2 flex-wrap">
          <BackLink href="/profile" label="Back to profile" />
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Saved AI plans, your bookings, and trip calendar — all in one place.
        </p>
        <TripsTabs />
        <div>{children}</div>
      </div>
    </div>
  );
}
