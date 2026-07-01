import Link from "next/link";

/**
 * Signed-out landing for the Trips hub + Calendar. Presentational only (no hooks)
 * so it renders in both the server `/trips` page and the client `/trips/calendar`
 * page. Sits inside TripsLayout, which already provides the heading, tabs and
 * page chrome — this only fills the content slot.
 */

const CONTENT = {
  trips: {
    emoji: "🧳",
    title: "All your Bali trips, in one place",
    subtitle:
      "Save AI itineraries, track confirmed bookings, and get an AI pre-trip briefing — sign in to start.",
    benefits: [
      { icon: "✨", title: "Saved AI plans", body: "Every itinerary you generate, ready to refine or book." },
      { icon: "🎟️", title: "Your bookings", body: "Confirmed tours with tickets, dates and meeting points." },
      { icon: "🧭", title: "Pre-trip briefing", body: "AI preps you for closures, culture and what to pack." },
      { icon: "🗓️", title: "Trip calendar", body: "Bookings, plans and your own events in one view." },
    ],
    callback: "/trips",
  },
  calendar: {
    emoji: "🗓️",
    title: "Your Bali trip calendar",
    subtitle:
      "Bookings, saved itineraries, notes and your own events on one calendar — with reminders. Sign in to view it.",
    benefits: [
      { icon: "🎟️", title: "Bookings auto-added", body: "Confirmed tours land on the right day automatically." },
      { icon: "✨", title: "Itineraries mapped", body: "Saved AI plans spread across their travel dates." },
      { icon: "🔔", title: "Reminders", body: "Get a nudge the day before each activity." },
      { icon: "🔗", title: "Share read-only", body: "Send a public link of your trip to travel buddies." },
    ],
    callback: "/trips/calendar",
  },
} as const;

export default function TripsSignedOut({ variant }: { variant: "trips" | "calendar" }) {
  const c = CONTENT[variant];
  const loginHref = `/login?callbackUrl=${encodeURIComponent(c.callback)}`;
  const registerHref = `/register?callbackUrl=${encodeURIComponent(c.callback)}`;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0071CE] to-[#005ba6] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-lg">
          <span className="text-3xl" aria-hidden>{c.emoji}</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">{c.title}</h2>
          <p className="mt-2 text-sm text-blue-50 leading-relaxed">{c.subtitle}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href={registerHref}
              className="inline-flex items-center justify-center px-6 py-3 bg-white/15 border border-white/40 text-white font-bold rounded-full hover:bg-white/25 transition"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {c.benefits.map((b) => (
          <div key={b.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="shrink-0 text-2xl" aria-hidden>{b.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{b.title}</p>
              <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary path for browsers not ready to sign in */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
        <p className="text-sm text-gray-600">Not ready yet? Discover Bali first.</p>
        <div className="mt-3 flex flex-col sm:flex-row justify-center gap-2">
          <Link
            href="/ai/plan"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#0071CE] text-white text-sm font-bold hover:bg-[#005ba6] transition"
          >
            ✨ Plan a trip with AI
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 text-sm font-bold hover:border-[#0071CE] hover:text-[#0071CE] transition"
          >
            Explore the map
          </Link>
        </div>
      </div>
    </div>
  );
}
