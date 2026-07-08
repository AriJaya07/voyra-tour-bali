import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/data/safeDb";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { estimateReadingMinutes } from "@/lib/guides/readingTime";
import GuidesBrowser from "@/components/guides/GuidesBrowser";
import MeetGuidesRail from "@/components/guides/MeetGuidesRail";
import EmptyStateAi from "@/components/guides/EmptyStateAi";
import type {
  BaliNoteFallbackItem,
  GuideListItem,
  TourGuideRailItem,
} from "@/components/guides/types";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Bali Travel Guides | ${SITE_NAME}`,
  description: `Long-form Bali travel guides — best things to do, when to go, region picks, sustainable travel tips.`,
  alternates: { canonical: `${SITE_URL}/guides` },
};

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null;

export default async function GuidesIndexPage() {
  const [guideRowsRes, tourGuideRowsRes, noteRowsRes] = await Promise.allSettled([
    safeDb(
      "page:guides:list",
      () =>
        prisma.guide.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 50,
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            region: true,
            tags: true,
            publishedAt: true,
            views: true,
            body: true,
          },
        }),
      [] as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    ),
    safeDb(
      "page:guides:tourGuides",
      () =>
        prisma.tourGuide.findMany({
          orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
          take: 4,
          select: {
            id: true,
            slug: true,
            name: true,
            photo: true,
            yearsActive: true,
            rating: true,
            reviewCount: true,
            languages: true,
          },
        }),
      [] as Awaited<ReturnType<typeof prisma.tourGuide.findMany>>,
    ),
    safeDb(
      "page:guides:notes",
      () =>
        prisma.baliNote.findMany({
          where: { visibility: "PUBLIC" },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            targetTitle: true,
            targetType: true,
            body: true,
            rating: true,
            date: true,
          },
        }),
      [] as Awaited<ReturnType<typeof prisma.baliNote.findMany>>,
    ),
  ]);
  const guideRows = guideRowsRes.status === "fulfilled" ? guideRowsRes.value : [];
  const tourGuideRows = tourGuideRowsRes.status === "fulfilled" ? tourGuideRowsRes.value : [];
  const noteRows = noteRowsRes.status === "fulfilled" ? noteRowsRes.value : [];

  const guides: GuideListItem[] = guideRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    excerpt: g.excerpt,
    coverImage: g.coverImage,
    region: g.region,
    tags: g.tags,
    publishedAt: g.publishedAt ? g.publishedAt.toISOString() : null,
    views: g.views,
    readingMinutes: estimateReadingMinutes(g.body),
  }));

  const meetGuides: TourGuideRailItem[] = tourGuideRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    photo: g.photo,
    yearsActive: g.yearsActive,
    rating: g.rating,
    reviewCount: g.reviewCount,
    languages: g.languages,
  }));

  const fallbackNotes: BaliNoteFallbackItem[] = noteRows.map((n) => ({
    id: n.id,
    targetTitle: n.targetTitle,
    targetType: n.targetType,
    body: n.body,
    rating: n.rating,
    date: n.date ? n.date.toISOString() : null,
  }));

  const regions = new Set(guides.map((g) => g.region).filter(Boolean));
  const latestPublished = guides[0]?.publishedAt ? new Date(guides[0].publishedAt) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/images/banner/banner-guide.png')] bg-cover bg-center pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/80 via-[#005bb5]/65 to-[#003d80]/85 pointer-events-none"
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Travel Guides
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 drop-shadow">
            Bali, by region & theme
          </h1>
          <p className="text-sm text-blue-50 drop-shadow-sm">
            Long-form guides written by our local team. No fluff, no SEO listicles — just useful detail.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-100/95">
            <span>📚 {guides.length} guide{guides.length === 1 ? "" : "s"}</span>
            <span>📍 {regions.size} region{regions.size === 1 ? "" : "s"}</span>
            {latestPublished && <span>🕓 Updated {fmtDate(latestPublished)}</span>}
          </div>
        </div>
      </section>

      <Container>
        <div className="max-w-6xl mx-auto py-10 sm:py-14">
          {guides.length === 0 ? (
            <EmptyStateAi notes={fallbackNotes} />
          ) : (
            <Suspense fallback={<BrowserSkeleton />}>
              <GuidesBrowser guides={guides} fallbackNotes={fallbackNotes} />
            </Suspense>
          )}

          <MeetGuidesRail guides={meetGuides} />

          <section className="mt-10 rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE] mb-1">Don&apos;t want to read?</p>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">Skip to a tailored AI plan</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tell us your dates and budget. We&apos;ll build the itinerary in 30 seconds.
              </p>
            </div>
            <Link
              href="/ai/plan?from=guides"
              className="inline-flex items-center gap-1.5 px-5 py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm shrink-0"
            >
              ✨ Generate itinerary
            </Link>
          </section>
        </div>
      </Container>
    </div>
  );
}

function BrowserSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-72 rounded-2xl bg-white border border-gray-100 animate-pulse" />
      ))}
    </div>
  );
}
