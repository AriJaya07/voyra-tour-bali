import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { estimateReadingMinutes } from "@/lib/guides/readingTime";
import { extractToc } from "@/lib/guides/toc";
import GuideMarkdown from "@/components/guides/detail/GuideMarkdown";
import GuideToc from "@/components/guides/detail/GuideToc";
import RelatedGuides from "@/components/guides/detail/RelatedGuides";
import AiPlanHandoff from "@/components/guides/detail/AiPlanHandoff";
import ViewCounterBeacon from "@/components/guides/detail/ViewCounterBeacon";
import Breadcrumbs from "@/components/guides/detail/Breadcrumbs";
import type { GuideListItem } from "@/components/guides/types";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await prisma.guide.findUnique({ where: { slug } });
  if (!guide || guide.status !== "PUBLISHED") return { title: "Guide not found" };
  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.excerpt,
    alternates: { canonical: `${SITE_URL}/guides/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      type: "article",
      url: `${SITE_URL}/guides/${slug}`,
      ...(guide.coverImage && {
        images: [{ url: guide.coverImage, width: 1200, height: 630, alt: guide.title }],
      }),
    },
  };
}

const fmtLong = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await prisma.guide.findUnique({ where: { slug } });
  if (!guide || guide.status !== "PUBLISHED") notFound();

  const minutes = estimateReadingMinutes(guide.body);
  const toc = extractToc(guide.body);

  // Related: same region OR ≥1 tag overlap, exclude self.
  const relatedRaw = await prisma.guide.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: guide.id },
      OR: [
        ...(guide.region ? [{ region: guide.region }] : []),
        ...(guide.tags.length > 0 ? [{ tags: { hasSome: guide.tags } }] : []),
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
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
  });

  const related: GuideListItem[] = relatedRaw.map((g) => ({
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt,
    image: guide.coverImage ? [guide.coverImage] : undefined,
    datePublished: guide.publishedAt?.toISOString(),
    dateModified: guide.updatedAt.toISOString(),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/guides/${slug}`,
    articleSection: guide.region ?? undefined,
    keywords: guide.tags.length > 0 ? guide.tags.join(", ") : undefined,
  };

  return (
    <article className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewCounterBeacon slug={slug} />

      <header className="bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white relative overflow-hidden">
        {guide.coverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={guide.coverImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0071CE]/70 to-[#003060]/85" />
          </>
        )}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <Breadcrumbs region={guide.region} title={guide.title} />
          <div className="mt-4 flex flex-wrap gap-2 mb-3">
            {guide.region && (
              <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {guide.region}
              </span>
            )}
            <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              📖 {minutes} min read
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            {guide.title}
          </h1>
          <p className="text-base sm:text-lg text-blue-100 max-w-xl leading-relaxed">{guide.excerpt}</p>
          <p className="mt-4 text-xs text-blue-200/80">
            Published {fmtLong(guide.publishedAt)}
            {guide.publishedAt &&
              guide.updatedAt &&
              guide.updatedAt.getTime() - guide.publishedAt.getTime() > 86_400_000 &&
              ` · Updated ${fmtLong(guide.updatedAt)}`}
            {" · "}
            {guide.views.toLocaleString()} views
          </p>
        </div>
      </header>

      <Container>
        <div className="max-w-6xl mx-auto py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
            <GuideToc items={toc} />
            <div>
              <GuideMarkdown body={guide.body} />

              {guide.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {guide.tags.map((t) => (
                    <a
                      key={t}
                      href={`/guides?theme=${encodeURIComponent(t)}`}
                      className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition"
                    >
                      #{t}
                    </a>
                  ))}
                </div>
              )}

              <AiPlanHandoff region={guide.region} tags={guide.tags} title={guide.title} />
              <RelatedGuides guides={related} />
            </div>
          </div>
        </div>
      </Container>
    </article>
  );
}
