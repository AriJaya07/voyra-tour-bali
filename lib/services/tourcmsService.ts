import { prisma } from "@/lib/prisma";
import {
  TOURCMS_COUNTRY_ISO,
  TOURCMS_DEFAULT_CHANNEL,
  TOURCMS_GEO_FILTER,
  TOURCMS_LISTING_CHANNEL,
  TOURCMS_LOCATION_KEYWORDS,
  TOURCMS_MOCK,
} from "@/lib/config/tourcms";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import type {
  TourcmsAvailabilityResult,
  TourcmsBookingOptions,
  TourcmsListResult,
  TourcmsListing,
  TourcmsPaxMixEntry,
  TourcmsProductDetail,
} from "@/types/tourcms";

const LIST_CACHE_MS = 60 * 60 * 1000;

function parseProductCode(code: string): { channelId: number; tourId: number } {
  const [c, t] = code.split(":");
  return { channelId: Number(c), tourId: Number(t) };
}

/**
 * Defense-in-depth filter: even if upstream returns non-Bali items
 * (e.g. operators with mixed catalog or wrong country tagging),
 * drop anything that does not match the configured Bali keywords.
 *
 * Set TOURCMS_GEO_FILTER=off to disable.
 */
function isBaliMatch(item: TourcmsListing): boolean {
  if (TOURCMS_GEO_FILTER === "off") return true;
  const haystack = [item.city, item.country, item.title, item.shortDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  if (
    TOURCMS_COUNTRY_ISO &&
    haystack.includes("indonesia")
  ) {
    return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
  }
  return TOURCMS_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
}

type BaliFixture = {
  title: string;
  city: string;
  shortDescription: string;
  durationText: string;
  fromPrice: number;
  currencyCode: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
};

const BALI_FIXTURES: BaliFixture[] = [
  {
    title: "Mount Batur Sunrise Trekking with Breakfast",
    city: "Kintamani",
    shortDescription:
      "Pre-dawn ascent to 1,717m volcanic summit. Watch sunrise over Lake Batur, breakfast cooked by volcanic steam.",
    durationText: "8h",
    fromPrice: 55,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 1842,
  },
  {
    title: "Ubud Rice Terrace, Waterfall & Monkey Forest Tour",
    city: "Ubud",
    shortDescription:
      "Tegalalang rice terraces, Tegenungan waterfall, Sacred Monkey Forest. Private driver, lunch at organic farm.",
    durationText: "10h",
    fromPrice: 45,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1200&q=70",
    rating: 4.9,
    reviewCount: 2341,
  },
  {
    title: "Nusa Penida West Island Day Trip from Sanur",
    city: "Nusa Penida",
    shortDescription:
      "Kelingking T-Rex viewpoint, Angel's Billabong, Broken Beach, Crystal Bay snorkel. Fast boat from Sanur included.",
    durationText: "12h",
    fromPrice: 75,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=70",
    rating: 4.7,
    reviewCount: 3120,
  },
  {
    title: "Uluwatu Temple Sunset & Kecak Fire Dance",
    city: "Uluwatu",
    shortDescription:
      "Cliff-top temple visit, traditional Kecak performance at sunset, optional Jimbaran seafood dinner.",
    durationText: "6h",
    fromPrice: 38,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?auto=format&fit=crop&w=1200&q=70",
    rating: 4.6,
    reviewCount: 1567,
  },
  {
    title: "Bali ATV Quad Bike Adventure through Jungle & Caves",
    city: "Payangan",
    shortDescription:
      "2-hour off-road quad ride through rice fields, river crossings, bat cave, waterfall stop. All gear provided.",
    durationText: "5h",
    fromPrice: 65,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1623069344822-a3d7b6db6ec1?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 982,
  },
  {
    title: "White Water Rafting on Ayung River with Lunch",
    city: "Ubud",
    shortDescription:
      "Class II–III rapids through tropical gorge. Professional guides, hotel pickup, buffet lunch included.",
    durationText: "5h",
    fromPrice: 40,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=70",
    rating: 4.7,
    reviewCount: 1245,
  },
  {
    title: "Tanah Lot Temple & Taman Ayun Royal Temple Tour",
    city: "Tabanan",
    shortDescription:
      "Iconic ocean-rock temple at sunset plus 17th-century Mengwi royal water temple. Air-con vehicle, English-speaking driver.",
    durationText: "7h",
    fromPrice: 35,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=70",
    rating: 4.5,
    reviewCount: 876,
  },
  {
    title: "Snorkeling at Blue Lagoon Beach with Boat Trip",
    city: "Padang Bai",
    shortDescription:
      "Two snorkel sites, vibrant coral reefs, sea turtles, tropical fish. Equipment, guide, lunch included.",
    durationText: "8h",
    fromPrice: 50,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 1654,
  },
  {
    title: "Balinese Cooking Class with Market Visit",
    city: "Ubud",
    shortDescription:
      "Local market tour, prepare 5 traditional dishes (lawar, sate lilit, gado-gado, base genep, jaja), recipe booklet.",
    durationText: "6h",
    fromPrice: 42,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=1200&q=70",
    rating: 4.9,
    reviewCount: 2103,
  },
  {
    title: "Lempuyang Temple 'Gates of Heaven' Sunrise Tour",
    city: "Karangasem",
    shortDescription:
      "Pre-dawn pickup, photo at iconic split gate framing Mount Agung, Tirta Gangga water palace stop.",
    durationText: "11h",
    fromPrice: 60,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1604665673884-6391df74e15a?auto=format&fit=crop&w=1200&q=70",
    rating: 4.6,
    reviewCount: 1432,
  },
  {
    title: "Bali Swing & Instagram Spots Photo Tour",
    city: "Ubud",
    shortDescription:
      "Jungle swings up to 78m above gorge, nest photo props, rice terrace lookouts. GoPro footage included.",
    durationText: "5h",
    fromPrice: 48,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=1200&q=70",
    rating: 4.7,
    reviewCount: 1089,
  },
  {
    title: "Surfing Lesson at Kuta Beach for Beginners",
    city: "Kuta",
    shortDescription:
      "2-hour group lesson with ISA-certified instructor, soft-top board, rashguard, photo of first wave.",
    durationText: "3h",
    fromPrice: 30,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 1876,
  },
  {
    title: "Spa Day at Luxury Seminyak Resort",
    city: "Seminyak",
    shortDescription:
      "Balinese massage, flower bath, body scrub, facial. 3-hour package with herbal tea and tropical fruit.",
    durationText: "4h",
    fromPrice: 55,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=70",
    rating: 4.9,
    reviewCount: 743,
  },
  {
    title: "Sekumpul & Banyumala Twin Waterfalls Trekking",
    city: "Singaraja",
    shortDescription:
      "Two of Bali's most spectacular falls in north Bali jungle. Moderate trek, swimming time, lunch.",
    durationText: "10h",
    fromPrice: 58,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 654,
  },
  {
    title: "Lovina Dolphin Watching at Sunrise",
    city: "Lovina",
    shortDescription:
      "Traditional jukung boat trip to spot wild dolphins in calm north Bali waters. Coffee + breakfast.",
    durationText: "4h",
    fromPrice: 25,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1564550974352-32c0bbe0b8a4?auto=format&fit=crop&w=1200&q=70",
    rating: 4.4,
    reviewCount: 521,
  },
  {
    title: "Amed Snorkeling & USAT Liberty Wreck Dive",
    city: "Amed",
    shortDescription:
      "Snorkel WWII shipwreck in 5-30m water, vibrant coral garden at Jemeluk Bay. Discover-Scuba option for non-divers.",
    durationText: "9h",
    fromPrice: 70,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=70",
    rating: 4.9,
    reviewCount: 432,
  },
  {
    title: "Bali Bird Park & Reptile Park Combo Ticket",
    city: "Gianyar",
    shortDescription:
      "1,000+ birds from 250 species, free-flight enclosures, bird show. Adjacent reptile park entry included.",
    durationText: "5h",
    fromPrice: 32,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1200&q=70",
    rating: 4.5,
    reviewCount: 1234,
  },
  {
    title: "Canggu Sunset Beach Cycling Tour",
    city: "Canggu",
    shortDescription:
      "Easy 2-hour ride past Echo Beach, Berawa, Tanah Lot temple at golden hour. Bike + helmet included.",
    durationText: "3h",
    fromPrice: 28,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=70",
    rating: 4.6,
    reviewCount: 387,
  },
  {
    title: "Tirta Empul Holy Water Purification Ceremony",
    city: "Tampaksiring",
    shortDescription:
      "Sacred Hindu spring temple, guided melukat ritual under 13 holy spouts, sarong + sash provided.",
    durationText: "5h",
    fromPrice: 40,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 1543,
  },
  {
    title: "Jimbaran Seafood Dinner on the Beach",
    city: "Jimbaran",
    shortDescription:
      "Fresh-caught grilled lobster, prawns, snapper, squid combo. Beachfront table at sunset, hotel transfers.",
    durationText: "4h",
    fromPrice: 45,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=1200&q=70",
    rating: 4.7,
    reviewCount: 2341,
  },
  {
    title: "Nusa Lembongan Snorkel & Mangrove Tour",
    city: "Nusa Lembongan",
    shortDescription:
      "Three snorkel stops including Manta Bay, mangrove forest cruise, beach lunch on quiet island.",
    durationText: "10h",
    fromPrice: 68,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 1098,
  },
  {
    title: "Mount Agung Sunrise Hike from Pasar Agung Route",
    city: "Karangasem",
    shortDescription:
      "Challenging 6h ascent of Bali's highest peak (3,031m). Headlamp, snacks, certified guide.",
    durationText: "12h",
    fromPrice: 85,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1604665673884-6391df74e15a?auto=format&fit=crop&w=1200&q=70",
    rating: 4.7,
    reviewCount: 432,
  },
  {
    title: "Sanur to Nusa Penida East Coast Tour",
    city: "Nusa Penida",
    shortDescription:
      "Diamond Beach, Atuh Beach, Thousand Islands viewpoint. Less crowded east-side itinerary, lunch included.",
    durationText: "12h",
    fromPrice: 78,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=70",
    rating: 4.8,
    reviewCount: 876,
  },
  {
    title: "Denpasar Heritage Walking Tour",
    city: "Denpasar",
    shortDescription:
      "Bajra Sandhi monument, Pasar Badung market, Pura Jagatnatha, Bali Museum. Half-day cultural intro.",
    durationText: "4h",
    fromPrice: 22,
    currencyCode: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=70",
    rating: 4.4,
    reviewCount: 245,
  },
];

function mockListing(idx: number, channelId: number): TourcmsListing {
  const f = BALI_FIXTURES[idx % BALI_FIXTURES.length];
  const tourId = 1000 + idx;
  const slugBase = f.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return {
    productCode: `${channelId}:${tourId}`,
    channelId,
    tourId,
    title: f.title,
    slug: `${channelId}-${tourId}-${slugBase}`,
    imageUrl: f.imageUrl,
    thumbnailUrl: f.imageUrl,
    shortDescription: f.shortDescription,
    fromPrice: f.fromPrice,
    currencyCode: f.currencyCode,
    durationText: f.durationText,
    city: f.city,
    country: "Indonesia",
    rating: f.rating,
    reviewCount: f.reviewCount,
  };
}

export async function listProducts(opts: {
  q?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  channelId?: number;
  noCache?: boolean;
}): Promise<TourcmsListResult> {
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 24;
  const channelId = opts.channelId ?? TOURCMS_LISTING_CHANNEL;

  if (TOURCMS_MOCK) {
    const total = BALI_FIXTURES.length;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const items = [];
    for (let i = start; i < end; i++) {
      items.push(mockListing(i, channelId || TOURCMS_DEFAULT_CHANNEL || 1));
    }
    return { items, total, page, pageSize };
  }

  const cacheKey = `${channelId}:list:${opts.q || ""}:${opts.categoryId || ""}:${page}:${pageSize}`;
  if (!opts.noCache) {
    const cached = await prisma.tourcmsProductCache.findUnique({
      where: { productCode: cacheKey },
    });
    if (cached && cached.expiresAt > new Date()) {
      const payload = cached.payloadJson as unknown as TourcmsListResult;
      if (payload.items?.length) return payload;
    }
  }

  let raw: TourcmsListResult;
  try {
    raw = await tourcmsClient.searchTours({
      q: opts.q,
      categoryId: opts.categoryId,
      page,
      pageSize,
      channelId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[TourCMS] searchTours failed:", msg);
    throw err;
  }

  console.log(
    `[TourCMS] upstream returned ${raw.items.length}/${raw.total} (filter=${TOURCMS_GEO_FILTER})`
  );

  const filteredItems = raw.items.filter(isBaliMatch);
  const dropped = raw.items.length - filteredItems.length;
  if (dropped > 0) {
    console.log(`[TourCMS] post-filter dropped ${dropped} non-Bali items`);
  }
  const result = {
    ...raw,
    items: filteredItems,
    total: Math.max(0, raw.total - dropped),
  };

  if (result.items.length > 0) {
    await prisma.tourcmsProductCache.upsert({
      where: { productCode: cacheKey },
      create: {
        productCode: cacheKey,
        channelId,
        tourId: 0,
        payloadJson: result as unknown as object,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + LIST_CACHE_MS),
      },
      update: {
        payloadJson: result as unknown as object,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + LIST_CACHE_MS),
      },
    });
  }

  return result;
}

export async function getProduct(
  productCode: string
): Promise<TourcmsProductDetail | null> {
  const { channelId, tourId } = parseProductCode(productCode);
  if (!channelId || !tourId) return null;

  if (TOURCMS_MOCK) {
    const idx = (tourId - 1000) % BALI_FIXTURES.length;
    const fixture = BALI_FIXTURES[idx >= 0 ? idx : 0];
    const listing = mockListing(tourId - 1000, channelId);
    return {
      ...listing,
      description: `${fixture.shortDescription} Experience the authentic culture and natural beauty of Bali on this curated ${fixture.durationText} tour, departing from ${fixture.city} with hotel pickup available across South Bali (Kuta, Seminyak, Canggu, Sanur, Ubud).`,
      highlights: [
        `Hand-picked ${fixture.city} experience by our local partner network`,
        "Hotel pickup + drop-off (South Bali area)",
        "English-speaking driver/guide",
        `Duration: ${fixture.durationText}`,
        "Small-group or private option available",
      ],
      inclusions: [
        "Air-conditioned transport with private driver",
        "All entrance fees and permits",
        "Bottled water",
        "Lunch at local restaurant",
        "Insurance",
      ],
      exclusions: [
        "Gratuities (optional)",
        "Personal expenses",
        "Additional activities not listed",
      ],
      meetingPoint: `Hotel pickup from ${fixture.city} area, or Voyra meeting point at Ubud Palace`,
      images: [
        { url: fixture.imageUrl, alt: fixture.title },
        {
          url: "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?auto=format&fit=crop&w=1600&q=70",
          alt: `${fixture.city} landscape`,
        },
        {
          url: "https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1600&q=70",
          alt: "Bali culture",
        },
      ],
      ageBands: ["ADULT", "CHILD"],
    };
  }

  const product = await tourcmsClient.showTour({ channelId, tourId });
  if (!product) return null;
  if (!isBaliMatch(product)) return null;
  return product;
}

export async function getProductBySlug(
  slug: string
): Promise<TourcmsProductDetail | null> {
  const parts = slug.split("-");
  if (parts.length < 2) return null;
  const channelId = Number(parts[0]);
  const tourId = Number(parts[1]);
  if (!channelId || !tourId) return null;
  return getProduct(`${channelId}:${tourId}`);
}

export async function getAvailability(args: {
  productCode: string;
  travelDate: string;
  paxMix: TourcmsPaxMixEntry[];
}): Promise<TourcmsAvailabilityResult> {
  const { channelId, tourId } = parseProductCode(args.productCode);

  if (TOURCMS_MOCK) {
    const total = args.paxMix.reduce((s, p) => s + p.numberOfTravelers, 0) || 1;
    const ts = Date.now();
    return {
      available: true,
      productCode: args.productCode,
      travelDate: args.travelDate,
      currencyCode: "USD",
      slots: [
        {
          componentKey: `MOCK-CK-AM-${ts}`,
          rateId: "MOCK-RATE-1",
          startTime: "09:00",
          available: true,
          totalPrice: 45 * total,
          currencyCode: "USD",
          rateName: "Morning departure",
          spacesRemaining: 10,
        },
        {
          componentKey: `MOCK-CK-PM-${ts}`,
          rateId: "MOCK-RATE-1",
          startTime: "13:00",
          available: true,
          totalPrice: 45 * total,
          currencyCode: "USD",
          rateName: "Afternoon departure",
          spacesRemaining: 10,
        },
      ],
      _mock: true,
    };
  }

  return tourcmsClient.checkAvailability({
    channelId,
    tourId,
    date: args.travelDate,
    paxMix: args.paxMix,
  });
}

export async function resolveBookingOptions(args: {
  productCode: string;
  travelDate: string;
  paxMix: TourcmsPaxMixEntry[];
}): Promise<TourcmsBookingOptions> {
  const { channelId, tourId } = parseProductCode(args.productCode);

  if (TOURCMS_MOCK) {
    const avail = await getAvailability(args);
    return {
      productCode: args.productCode,
      travelDate: args.travelDate,
      options: avail.slots,
    };
  }

  return tourcmsClient.checkOptions({
    channelId,
    tourId,
    date: args.travelDate,
    paxMix: args.paxMix,
  });
}
