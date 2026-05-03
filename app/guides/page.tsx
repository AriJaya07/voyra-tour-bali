import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Bali Travel Guides | ${SITE_NAME}`,
  description: `Long-form Bali travel guides — best things to do, when to go, region picks, sustainable travel tips.`,
  alternates: { canonical: `${SITE_URL}/guides` },
};

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

export default async function GuidesIndexPage() {
  const guides = await prisma.guide.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

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
        </div>
      </section>

      <Container>
        <div className="max-w-5xl mx-auto py-10 sm:py-16">
          {guides.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">More guides coming soon</p>
              <p className="text-sm text-gray-500 mb-6">
                Our local team is writing destination + theme guides. In the meantime, try the AI planner.
              </p>
              <Link
                href="/plan"
                className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition"
              >
                ✨ Plan my trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {guides.map((g) => (
                <Link
                  key={g.id}
                  href={`/guides/${g.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[#0071CE]/40 hover:shadow-md transition group"
                >
                  <div className="relative h-44 bg-gray-100">
                    {g.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.coverImage}
                        alt={g.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-3xl">
                        📖
                      </div>
                    )}
                    {g.region && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 text-[10px] font-bold uppercase tracking-wider text-gray-700 rounded-full">
                        {g.region}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{g.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-2">{g.excerpt}</p>
                    <p className="text-[11px] text-gray-400">
                      {fmtDate(g.publishedAt)} · {g.views.toLocaleString()} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
