import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { buildViatorProductUrl } from "@/lib/config/viator";

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode?: string;
  title: string;
  source: string;
  notes?: string;
  href?: string;
  imageUrl?: string;
  price?: number | null;
}

const SLOT_EMOJI: Record<PlanItem["slot"], string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
};

const SLOT_LABEL: Record<PlanItem["slot"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const it = await prisma.savedItinerary.findUnique({
    where: { shareSlug: slug },
    select: { title: true, visibility: true },
  });
  if (!it || it.visibility !== "PUBLIC") return { title: "Itinerary not found" };
  return {
    title: `${it.title} | ${SITE_NAME}`,
    description: `A shareable Bali itinerary on ${SITE_NAME}.`,
    alternates: { canonical: `${SITE_URL}/share/itinerary/${slug}` },
  };
}

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null;

export default async function SharedItineraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const it = await prisma.savedItinerary.findUnique({
    where: { shareSlug: slug },
    include: { user: { select: { name: true } } },
  });

  if (!it || it.visibility !== "PUBLIC") notFound();

  const items = (it.itemsJson as unknown as PlanItem[]) || [];
  const days = Math.max(1, Math.max(...items.map((x) => x.day || 1), 1));

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Shared Itinerary
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">{it.title}</h1>
          <p className="text-sm text-blue-100">
            {it.user?.name ? `By ${it.user.name}` : "Shared traveler"}
            {it.fromDate && it.toDate && (
              <>
                {" "}
                · {fmt(new Date(it.fromDate))} → {fmt(new Date(it.toDate))}
              </>
            )}
          </p>
        </div>
      </section>

      <Container>
        <div className="max-w-3xl mx-auto py-10 sm:py-16">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-sm text-[#0071CE] hover:underline">
              ← Browse Bali tours
            </Link>
            <Link
              href="/ai/plan"
              className="text-sm font-bold text-[#0071CE] hover:underline"
            >
              Build your own ✨
            </Link>
          </div>

          {Array.from({ length: days }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayItems = items.filter((x) => x.day === dayNum);
            if (dayItems.length === 0) return null;
            return (
              <div key={dayNum} className="mb-4 bg-white border border-gray-100 rounded-2xl p-5">
                <h2 className="font-bold text-gray-900 mb-3">Day {dayNum}</h2>
                <div className="space-y-3">
                  {dayItems
                    .sort((a, b) => {
                      const o = { morning: 0, afternoon: 1, evening: 2 } as const;
                      return o[a.slot] - o[b.slot];
                    })
                    .map((it, i) => {
                      const href =
                        it.href ||
                        (it.productCode ? buildViatorProductUrl(it.productCode, it.title) : null);
                      return (
                        <div key={i} className="flex gap-3 border-l-4 border-blue-100 pl-3">
                          <div className="text-xl">{SLOT_EMOJI[it.slot]}</div>
                          {it.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.imageUrl}
                              alt={it.title}
                              className="hidden sm:block w-20 h-16 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                              {SLOT_LABEL[it.slot]}
                              {it.source === "viator" && (
                                <span className="ml-1 text-[#0071CE]">· Bookable</span>
                              )}
                            </p>
                            <p className="font-bold text-sm text-gray-900 leading-snug">{it.title}</p>
                            {it.notes && (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{it.notes}</p>
                            )}
                          </div>
                          {href && (
                            <a
                              href={href}
                              target={href.startsWith("http") ? "_blank" : undefined}
                              rel="noopener noreferrer sponsored"
                              className="self-center px-3 py-1.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition shrink-0"
                            >
                              Book
                            </a>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

          <div className="mt-10 bg-gradient-to-br from-[#0071CE]/5 to-blue-50 border border-[#0071CE]/20 rounded-2xl p-6 text-center">
            <p className="text-gray-900 font-bold text-base mb-2">Like this plan?</p>
            <p className="text-gray-600 text-sm mb-4">Build your own personalised Bali itinerary in seconds.</p>
            <Link
              href="/ai/plan"
              className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
            >
              ✨ Plan my Bali trip
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
