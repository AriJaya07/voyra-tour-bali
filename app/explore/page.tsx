import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/data/safeDb";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { BALI_REGIONS } from "@/lib/data/baliRegions";
import MapExplorerLoader from "@/components/explore/MapExplorerLoader";
import type { RegionWithCount } from "@/components/explore/MapExplorer";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Explore Bali on the Map | ${SITE_NAME}`,
  description:
    "Discover Bali region by region on an interactive map — Ubud, Canggu, Uluwatu, Nusa Penida and more. Jump straight into local guides or build an AI itinerary.",
  alternates: { canonical: `${SITE_URL}/explore` },
};

export default async function ExplorePage() {
  // Published guide counts per region (graceful fallback if the DB is unreachable).
  const grouped = await safeDb(
    "page:explore:guideCounts",
    () =>
      prisma.guide.groupBy({
        by: ["region"],
        where: { status: "PUBLISHED", region: { not: null } },
        _count: { _all: true },
      }),
    [] as { region: string | null; _count: { _all: number } }[],
  );

  const counts = new Map<string, number>();
  for (const row of grouped) {
    if (row.region) counts.set(row.region.toLowerCase(), row._count._all);
  }

  const regions: RegionWithCount[] = BALI_REGIONS.map((r) => ({
    ...r,
    guideCount: counts.get(r.name.toLowerCase()) ?? 0,
  }));

  return (
    <main className="pt-20 lg:pt-24 pb-12">
      <Container>
        {/* Header */}
        <div className="max-w-2xl">
          <span className="inline-block text-xs font-bold uppercase tracking-wide text-[#0071CE] bg-[#0071CE]/10 px-3 py-1 rounded-full">
            Map Explorer
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
            Explore Bali region by region
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500 leading-relaxed">
            Pick a spot on the map to see what each area is known for, dive into local guides, or
            kick off an AI-built itinerary tailored to that region.
          </p>
        </div>

        {/* Map + region list */}
        <div className="mt-6 lg:mt-8">
          <MapExplorerLoader regions={regions} />
        </div>

        {/* Secondary CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/guides"
            className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#0071CE] hover:text-[#0071CE] transition"
          >
            Browse all guides
          </Link>
          <Link
            href="/ai/plan"
            className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-semibold transition shadow-sm"
          >
            Plan a trip with AI
          </Link>
        </div>
      </Container>
    </main>
  );
}
