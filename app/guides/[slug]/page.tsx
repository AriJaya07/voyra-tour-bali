import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";

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

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await prisma.guide.findUnique({ where: { slug } });
  if (!guide || guide.status !== "PUBLISHED") notFound();

  // Increment views (best-effort, fire and forget)
  prisma.guide.update({ where: { id: guide.id }, data: { views: { increment: 1 } } }).catch(() => null);

  return (
    <article className="min-h-screen bg-white">
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
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          {guide.region && (
            <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              {guide.region}
            </span>
          )}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            {guide.title}
          </h1>
          <p className="text-base sm:text-lg text-blue-100 max-w-xl leading-relaxed">{guide.excerpt}</p>
          <p className="mt-4 text-xs text-blue-200 opacity-70">
            {fmtDate(guide.publishedAt)} · {guide.views.toLocaleString()} views
          </p>
        </div>
      </header>

      <Container>
        <div className="max-w-3xl mx-auto py-12 sm:py-16">
          {/* Render markdown as paragraphs (simple — replace w/ remark/MDX later) */}
          <div className="prose prose-gray max-w-none">
            {guide.body.split(/\n\n+/).map((p, i) => (
              <p key={i} className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </div>

          {guide.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {guide.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 border border-blue-100 text-blue-700"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 bg-gradient-to-br from-[#0071CE]/5 to-blue-50 border border-[#0071CE]/20 rounded-2xl p-6 text-center">
            <p className="text-gray-900 font-bold text-base mb-2">Plan your Bali trip with AI</p>
            <p className="text-gray-600 text-sm mb-4">
              Use this guide as inspiration — let our AI build a day-by-day itinerary in 30 seconds.
            </p>
            <Link
              href="/plan"
              className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
            >
              ✨ Plan my Bali trip
            </Link>
          </div>
        </div>
      </Container>
    </article>
  );
}
