import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXTAUTH_URL || "https://voyra-tour-bali.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic destination pages
  let destinationPages: MetadataRoute.Sitemap = [];
  try {
    const destinations = await prisma.destination.findMany({
      select: { slug: true, updatedAt: true },
    });

    destinationPages = destinations.map((d) => ({
      url: `${SITE_URL}/detail/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));
  } catch {
    // DB unreachable at build time — return static pages only
  }

  return [...staticPages, ...destinationPages];
}
