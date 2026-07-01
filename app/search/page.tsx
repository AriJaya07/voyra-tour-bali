"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Container from "@/components/Container";
import OptimizedImage from "@/components/common/OptimizedImage";
import { useSearchDestinations } from "@/utils/hooks/useSearchDestinations";
import { useViatorSearch, getViatorImageUrl } from "@/utils/hooks/useViator";
import { useSearchParseMutation } from "@/utils/hooks/useAiWallet";
import { buildViatorProductUrl, VIATOR_PARTNER_ID } from "@/lib/config/viator";
import { formatBookingPrice } from "@/utils/formatPrice";
import { useCurrency } from "@/utils/hooks/useCurrency";
import type { AiSearchFilters } from "@/utils/service/ai.service";

interface ResultItem {
  id: string;
  title: string;
  href: string;
  imageUrl: string | null;
  categoryName: string;
  price: number | null;
  currency: string;
  external: boolean;
}

const EXAMPLES = [
  "Waterfall day trip for kids near Ubud",
  "Rainy-day indoor things in Seminyak",
  "Affordable snorkeling half-day",
  "Romantic sunset dinner in Uluwatu",
];

const POPULAR_REGIONS = [
  { name: "Ubud", emoji: "🌿" },
  { name: "Canggu", emoji: "🏄" },
  { name: "Seminyak", emoji: "🍸" },
  { name: "Uluwatu", emoji: "🛕" },
  { name: "Nusa Penida", emoji: "🏝️" },
  { name: "Sanur", emoji: "🚲" },
];

const POPULAR_ACTIVITIES = [
  "Waterfalls",
  "Snorkeling",
  "Cooking class",
  "Temple tour",
  "Surf lesson",
  "Spa & wellness",
  "Rice terraces",
  "ATV & rafting",
];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const { currency, exchangeRates } = useCurrency();

  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const [filters, setFilters] = useState<AiSearchFilters | null>(null);

  const parse = useSearchParseMutation();
  const { data: allDest = [], isLoading: dbLoading } = useSearchDestinations(true);
  const { data: viatorData, isLoading: viatorLoading } = useViatorSearch(submitted);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setSubmitted(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
    // AI intent parse (auth-only). Falls back to plain keyword search otherwise.
    if (status === "authenticated") {
      try {
        const res = await parse.mutateAsync(q);
        setFilters(res.filters);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/credit/i.test(msg)) {
          toast.message("Using keyword search", { description: "You're out of AI credits — smart search paused." });
        }
      }
    }
    setFilters(null);
  };

  // Auto-run when arriving with ?q=
  useEffect(() => {
    if (initialQ) runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keywords = (filters?.keywords || submitted).toLowerCase();

  const dbResults: ResultItem[] = useMemo(() => {
    if (!submitted) return [];
    const tokens = keywords.split(/\s+/).filter(Boolean);
    const region = filters?.region?.toLowerCase() ?? null;
    const budget = filters?.budgetMaxIdr ?? null;

    return allDest
      .filter((d) => {
        const text = `${d.title ?? ""} ${d.description ?? ""} ${d.category?.name ?? ""}`.toLowerCase();
        const kwHit = tokens.length === 0 || tokens.some((t) => text.includes(t));
        const regionHit = !region || text.includes(region);
        const budgetHit = budget == null || d.price == null || Number(d.price) <= budget;
        return kwHit && regionHit && budgetHit;
      })
      .map((d) => ({
        id: `db-${d.id}`,
        title: d.title,
        href: `/detail/${d.slug || d.id}`,
        imageUrl: d.images?.find((i) => i.isMain)?.url || d.images?.[0]?.url || null,
        categoryName: d.category?.name || "Destination",
        price: d.price != null ? Number(d.price) : null,
        currency: "IDR",
        external: false,
      }));
  }, [allDest, submitted, keywords, filters]);

  const viatorResults: ResultItem[] = useMemo(() => {
    const products = viatorData?.products ?? [];
    return products.map((v) => ({
      id: `viator-${v.productCode}`,
      title: v.title,
      href: buildViatorProductUrl(v.productCode, v.title),
      imageUrl: getViatorImageUrl(v.images, 320),
      categoryName: "Tour / Activity",
      price: v.pricing?.summary?.fromPrice ?? null,
      currency: v.pricing?.currency ?? "USD",
      external: true,
    }));
  }, [viatorData]);

  const viatorAllUrl = useMemo(() => {
    if (!submitted) return null;
    const u = new URL("https://www.viator.com/searchResults/all");
    u.searchParams.set("text", filters?.keywords || submitted);
    u.searchParams.set("pid", VIATOR_PARTNER_ID);
    u.searchParams.set("medium", "link.partner");
    return u.toString();
  }, [submitted, filters]);

  const loading = parse.isPending || dbLoading || viatorLoading;
  const total = dbResults.length + viatorResults.length;

  return (
    <main className="pt-20 lg:pt-24 pb-16 min-h-screen">
      <Container>
        <div className="max-w-2xl">
          <span className="inline-block text-xs font-bold uppercase tracking-wide text-[#0071CE] bg-[#0071CE]/10 px-3 py-1 rounded-full">
            AI Search
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
            Describe your ideal Bali day
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            Ask in plain words — budget, who&apos;s coming, the vibe. We&apos;ll match destinations and tours.
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="mt-5 flex flex-col sm:flex-row gap-2 max-w-3xl"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. waterfall trip good for kids near Ubud under 500k"
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm sm:text-base focus:border-[#0071CE] focus:outline-none focus:ring-2 focus:ring-[#0071CE]/20"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-xl bg-[#0071CE] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#005ba6] disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search ✨"}
          </button>
        </form>

        {/* Discovery — shown before the first search */}
        {!submitted && (
          <div className="mt-8 space-y-8">
            {/* Try one of these */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Try one of these</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuery(ex);
                      runSearch(ex);
                    }}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#0071CE] hover:shadow-md"
                  >
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#0071CE]">
                      “{ex}”
                    </span>
                    <span className="shrink-0 text-gray-300 group-hover:text-[#0071CE]">→</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Browse by region */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Browse by region</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {POPULAR_REGIONS.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => {
                      setQuery(r.name);
                      runSearch(r.name);
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#0071CE] hover:shadow-md"
                  >
                    <span className="text-2xl" aria-hidden>{r.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Popular activities */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Popular activities</h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_ACTIVITIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setQuery(a);
                      runSearch(a);
                    }}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#0071CE] hover:text-[#0071CE]"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </section>

            {/* Secondary paths */}
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
              <p className="text-sm text-gray-600">Prefer to browse the whole map or let AI plan for you?</p>
              <div className="mt-3 flex flex-col sm:flex-row justify-center gap-2">
                <a
                  href="/explore"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[#0071CE] hover:text-[#0071CE]"
                >
                  Explore the map
                </a>
                <a
                  href="/ai/plan"
                  className="inline-flex items-center justify-center rounded-full bg-[#0071CE] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#005ba6]"
                >
                  ✨ Plan a trip with AI
                </a>
              </div>
            </div>
          </div>
        )}

        {/* AI understanding banner */}
        {filters?.summary && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 max-w-3xl">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Understood:</span> {filters.summary}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filters.region && <Chip>📍 {filters.region}</Chip>}
              {filters.budgetMaxIdr && (
                <Chip>
                  ≤ {formatBookingPrice({ price: filters.budgetMaxIdr, currency: "IDR" }, currency, exchangeRates)}
                </Chip>
              )}
              {filters.kidFriendly && <Chip>👨‍👩‍👧 Family</Chip>}
              {filters.indoor === true && <Chip>☔ Indoor</Chip>}
              {filters.themes.map((t) => (
                <Chip key={t}>#{t}</Chip>
              ))}
            </div>
          </div>
        )}

        {status !== "authenticated" && submitted && (
          <p className="mt-4 text-xs text-gray-400 max-w-3xl">
            Tip: <a href="/login?callbackUrl=/search" className="text-[#0071CE] font-semibold hover:underline">sign in</a> to unlock smart AI search that understands budget & vibe.
          </p>
        )}

        {/* Results */}
        <div className="mt-6">
          {loading ? (
            <ResultsSkeleton />
          ) : submitted && total === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <span className="text-4xl">🔍</span>
              <p className="mt-3 font-bold text-gray-900">No matches</p>
              <p className="text-sm text-gray-500">Try a broader query or a different region.</p>
            </div>
          ) : submitted ? (
            <div className="space-y-8">
              {dbResults.length > 0 && (
                <Section title={`Voyra destinations (${dbResults.length})`}>
                  {dbResults.map((r) => (
                    <ResultCard key={r.id} item={r} currency={currency} exchangeRates={exchangeRates} />
                  ))}
                </Section>
              )}
              {viatorResults.length > 0 && (
                <Section title={`Tours & activities (${viatorResults.length})`}>
                  {viatorResults.map((r) => (
                    <ResultCard key={r.id} item={r} currency={currency} exchangeRates={exchangeRates} />
                  ))}
                </Section>
              )}
              {viatorAllUrl && (viatorData?.hasMore ?? false) && (
                <a
                  href={viatorAllUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/60 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  View more tours on Viator →
                </a>
              )}
            </div>
          ) : null}
        </div>
      </Container>
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function ResultCard({
  item,
  currency,
  exchangeRates,
}: {
  item: ResultItem;
  currency: Parameters<typeof formatBookingPrice>[1];
  exchangeRates: Parameters<typeof formatBookingPrice>[2];
}) {
  return (
    <a
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer sponsored" : undefined}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-blue-50 to-indigo-100">
        {item.imageUrl ? (
          <OptimizedImage
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🏝</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          {item.categoryName}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-[#0071CE]">{item.title}</p>
        {item.price != null && (
          <p className="mt-auto pt-2 text-xs text-gray-500">
            from{" "}
            <span className="font-semibold text-gray-800">
              {formatBookingPrice({ price: Number(item.price), currency: item.currency }, currency, exchangeRates)}
            </span>
          </p>
        )}
      </div>
    </a>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
