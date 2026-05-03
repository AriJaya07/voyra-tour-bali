import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${SITE_URL}/bali-events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/ai`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/plan`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/plans`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/trust-and-safety`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/status`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/cancellation-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic pages — DB unreachable at build time leaves only static.
  let destinationPages: MetadataRoute.Sitemap = [];
  let guidePages: MetadataRoute.Sitemap = [];
  let eventPages: MetadataRoute.Sitemap = [];
  let publicItineraryPages: MetadataRoute.Sitemap = [];

  try {
    const [destinations, guides, events, sharedItineraries] = await Promise.all([
      prisma.destination.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.guide.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.baliEvent.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.savedItinerary.findMany({
        where: { visibility: "PUBLIC", shareSlug: { not: null } },
        select: { shareSlug: true, updatedAt: true },
        take: 5000,
      }),
    ]);

    destinationPages = destinations
      .filter((d): d is { slug: string; updatedAt: Date } => Boolean(d.slug))
      .map((d) => ({
        url: `${SITE_URL}/detail/${d.slug}`,
        lastModified: d.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      }));

    guidePages = guides.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    eventPages = events.map((e) => ({
      url: `${SITE_URL}/bali-events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    publicItineraryPages = sharedItineraries
      .filter((i): i is { shareSlug: string; updatedAt: Date } => Boolean(i.shareSlug))
      .map((i) => ({
        url: `${SITE_URL}/share/itinerary/${i.shareSlug}`,
        lastModified: i.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  } catch {
    // DB unreachable at build time — return what we have.
  }

  return [
    ...staticPages,
    ...destinationPages,
    ...guidePages,
    ...eventPages,
    ...publicItineraryPages,
  ];
}
