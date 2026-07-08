import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { tryDb } from "@/lib/data/safeDb";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import OptimizedImage from "@/components/common/OptimizedImage";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await tryDb(
    () => prisma.tourGuide.findUnique({ where: { slug } }),
    null,
    { label: `tourGuide.metadata:${slug}` },
  );
  if (!g) return { title: "Guide not found" };
  return {
    title: `${g.name} — Bali Tour Guide | ${SITE_NAME}`,
    description: g.bio?.slice(0, 160) || `Meet ${g.name}, a Bali tour guide on ${SITE_NAME}.`,
    alternates: { canonical: `${SITE_URL}/guides/profiles/${slug}` },
  };
}

export default async function GuideProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await tryDb(
    () => prisma.tourGuide.findUnique({ where: { slug } }),
    null,
    { label: `tourGuide:${slug}` },
  );
  if (!g) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col sm:flex-row items-center gap-6">
          {g.photo ? (
            <OptimizedImage
              src={g.photo}
              alt={g.name}
              width={128}
              height={128}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-white/20 border-4 border-white flex items-center justify-center text-4xl font-bold">
              {g.name.slice(0, 1)}
            </div>
          )}
          <div className="text-center sm:text-left">
            <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              Tour Guide
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{g.name}</h1>
            <p className="text-sm text-blue-100 mt-1">
              {g.yearsActive}+ years guiding · ★ {g.rating.toFixed(1)} ({g.reviewCount} reviews)
            </p>
          </div>
        </div>
      </section>

      <Container>
        <div className="max-w-3xl mx-auto py-10 sm:py-16">
          {g.languages.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {g.languages.map((l) => (
                <span
                  key={l}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 border border-blue-100 text-blue-700"
                >
                  🗣 {l}
                </span>
              ))}
            </div>
          )}

          {g.bio && (
            <div className="prose prose-gray max-w-none mb-10">
              {g.bio.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                  {p}
                </p>
              ))}
            </div>
          )}

          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
          >
            Browse tours
          </Link>
        </div>
      </Container>
    </div>
  );
}
