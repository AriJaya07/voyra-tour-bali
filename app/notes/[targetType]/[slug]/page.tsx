import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { SITE_NAME, SITE_URL } from "@/lib/config";

const TARGET_TYPES = ["tour", "destination", "place"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

interface Params {
  targetType: string;
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { targetType, slug } = await params;
  const decoded = decodeURIComponent(slug);
  return {
    title: `Traveler Notes: ${decoded} | ${SITE_NAME}`,
    description: `Real notes from travelers about ${decoded} in Bali. Honest, unfiltered tips and ratings from people who went.`,
    alternates: { canonical: `${SITE_URL}/notes/${targetType}/${slug}` },
  };
}

export const revalidate = 600; // 10 min ISR

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export default async function NotesAggregatorPage({ params }: { params: Promise<Params> }) {
  const { targetType, slug } = await params;
  const decoded = decodeURIComponent(slug);

  if (!(TARGET_TYPES as readonly string[]).includes(targetType)) {
    notFound();
  }

  const where = {
    targetType,
    targetKey: decoded,
    visibility: "PUBLIC",
    status: "APPROVED",
  } as const;

  const [notes, total] = await Promise.all([
    prisma.baliNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        targetTitle: true,
        rating: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.baliNote.count({ where }),
  ]);

  const ratingItems = await prisma.baliNote.findMany({
    where: { ...where, rating: { not: null } },
    select: { rating: true },
  });
  const ratingCount = ratingItems.length;
  const ratingAvg =
    ratingCount > 0 ? ratingItems.reduce((s, r) => s + (r.rating || 0), 0) / ratingCount : null;

  const displayName = notes[0]?.targetTitle || decoded;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            {(targetType as TargetType).toUpperCase()} · TRAVELER NOTES
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
            Notes about {displayName}
          </h1>
          <p className="text-sm text-blue-100">
            {total} note{total === 1 ? "" : "s"} from travelers
            {ratingAvg !== null && ratingCount > 0 && (
              <>
                {" "}
                · ★ {ratingAvg.toFixed(1)} average ({ratingCount} rated)
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
            <Link href="/profile/notes" className="text-sm text-[#0071CE] hover:underline">
              Write your own note
            </Link>
          </div>

          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">No public notes yet</p>
              <p className="text-sm text-gray-500 mb-6">
                Be the first to share your experience.
              </p>
              <Link
                href="/profile/notes"
                className="inline-block px-6 py-3 bg-[#0071CE] text-white text-sm font-bold rounded-xl hover:bg-[#005ba6] transition shadow-sm"
              >
                + Write a Note
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((n) => (
                <article
                  key={n.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {n.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.user.image}
                        alt={n.user.name || "Traveler"}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                        {(n.user.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {n.user.name || "Anonymous traveler"}
                      </p>
                      <p className="text-xs text-gray-400">{fmtDate(new Date(n.createdAt))}</p>
                    </div>
                    {n.rating && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-base ${i < (n.rating ?? 0) ? "text-amber-500" : "text-gray-200"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {n.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
