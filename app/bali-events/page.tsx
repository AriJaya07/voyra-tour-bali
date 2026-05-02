import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Bali Events & Festivals | ${SITE_NAME}`,
  description:
    "Upcoming Bali festivals, ceremonies, and Nyepi day. Plan your trip around (or with) the cultural calendar.",
  alternates: { canonical: `${SITE_URL}/bali-events` },
};

const TYPE_BADGE: Record<string, string> = {
  NYEPI: "bg-purple-50 text-purple-700 border-purple-200",
  FESTIVAL: "bg-amber-50 text-amber-700 border-amber-200",
  CEREMONY: "bg-blue-50 text-blue-700 border-blue-200",
  PUBLIC_HOLIDAY: "bg-green-50 text-green-700 border-green-200",
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const daysUntil = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 3600 * 1000));
};

export default async function BaliEventsPage() {
  const events = await prisma.baliEvent.findMany({
    where: { date: { gte: new Date(new Date().getFullYear() - 1, 0, 1) } },
    orderBy: { date: "asc" },
    take: 100,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Cultural calendar
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">Bali Events</h1>
          <p className="text-sm text-blue-100">
            Festivals, ceremonies, Nyepi. Plan with the island, not against it.
          </p>
        </div>
      </section>

      <Container>
        <div className="max-w-3xl mx-auto py-10 sm:py-16">
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">Calendar coming soon</p>
              <p className="text-sm text-gray-500">
                Our local team is curating the next 12 months. Check back soon.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => {
                const eventDate = new Date(e.date);
                const past = eventDate < today;
                const nDays = daysUntil(eventDate);
                return (
                  <li
                    key={e.id}
                    className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm ${
                      past ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${TYPE_BADGE[e.type] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
                      >
                        {e.type.replace("_", " ")}
                      </span>
                      {!past && nDays <= 14 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                          {nDays === 0 ? "Today" : nDays === 1 ? "Tomorrow" : `In ${nDays}d`}
                        </span>
                      )}
                      {e.region && (
                        <span className="text-xs text-gray-500">📍 {e.region}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 leading-snug">{e.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(eventDate)}</p>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">{e.description}</p>
                    {e.impact && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        ⚠ Travel impact: {e.impact}
                      </p>
                    )}
                    {e.link && (
                      <Link
                        href={e.link}
                        className="inline-block mt-3 text-xs font-bold text-[#0071CE] hover:underline"
                      >
                        Learn more →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}
