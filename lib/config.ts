/**
 * ─────────────────────────────────────────────────────────────────
 *  GLOBAL SITE CONFIG
 *  Single source of truth for all environment variables and
 *  site-wide constants. Import from here — never read process.env
 *  directly in page/component files.
 * ─────────────────────────────────────────────────────────────────
 */

// ── Core URLs ─────────────────────────────────────────────────────
export const SITE_URL =
  process.env.NEXTAUTH_URL || "https://www.balitravelnow.com";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION || "";

// ── WhatsApp ───────────────────────────────────────────────────────
/** Raw number from env, e.g. "08571233232" */
const _rawWA = process.env.NEXT_PUBLIC_WA_NUMBER || "";

/**
 * International format for wa.me links (no +, no spaces).
 * Converts leading 0 to Indonesian country code 62.
 * e.g. "08571233232" → "628571233232"
 */
export const WHATSAPP_NUMBER = _rawWA.startsWith("0")
  ? "62" + _rawWA.slice(1)
  : _rawWA;

/**
 * Builds a full WhatsApp deep-link URL with an optional pre-filled message.
 * Usage: buildWhatsAppUrl("Hello, I want to book a tour")
 */
export function buildWhatsAppUrl(message = "Hello, I would like to inquire about booking a tour.") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// ── Brand Identity ────────────────────────────────────────────────
export const SITE_NAME = "Bali Travel Now";
export const SITE_TAGLINE = "Best Bali Tours, Activities & Experiences";
export const SITE_DESCRIPTION =
  "Discover and book the best Bali tours, activities, and travel experiences with Bali Travel Now. Explore Ubud, Nusa Penida, Seminyak, Kuta, and beyond — curated packages, real-time availability, and secure online booking.";
export const SITE_SHORT_DESCRIPTION =
  "Book the best Bali tours and travel activities with Bali Travel Now. Ubud, Nusa Penida, Seminyak and more — real-time availability, secure booking.";

export const SITE_TITLE_DEFAULT = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

// ── SEO Keywords ──────────────────────────────────────────────────
export const SITE_KEYWORDS = [
  "Bali tour packages",
  "Bali travel activities",
  "best Bali tours",
  "Bali travel agency",
  "Nusa Penida tour",
  "Ubud rice terrace tour",
  "Bali snorkeling",
  "Bali water sports",
  "Bali cultural tour",
  "Bali day tour",
  "Bali private tour",
  "Bali booking online",
  "Bali tour operator",
  "things to do in Bali",
  "Bali adventure activities",
  "Seminyak tour",
  "Kuta beach activities",
  "Bali temple tour",
  "affordable Bali tours",
  "Bali travel Indonesia",
];

// ── Open Graph / Social ───────────────────────────────────────────
export const OG_IMAGE = "/og-image.png";
export const OG_IMAGE_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// ── Business Info (used in JSON-LD structured data) ───────────────
export const BUSINESS_ADDRESS = {
  locality: "Bali",
  postalCode: "82121",
  region: "Bali",
  country: "ID",
};

export const BUSINESS_GEO = {
  latitude: "-8.4095",
  longitude: "115.1889",
};

export const BUSINESS_HOURS = "Mo-Su 08:00-20:00";
export const BUSINESS_PRICE_RANGE = "$$";
export const BUSINESS_CURRENCIES = "USD, IDR";
export const BUSINESS_PAYMENT = "Credit Card";

// ── JSON-LD: TravelAgency (used in root layout) ───────────────────
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${OG_IMAGE}`,
    description:
      "Discover and book the best Bali tours, activities, and travel experiences. Expert local guides, curated packages, secure online booking.",
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS_ADDRESS.locality,
      postalCode: BUSINESS_ADDRESS.postalCode,
      addressRegion: BUSINESS_ADDRESS.region,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_GEO.latitude,
      longitude: BUSINESS_GEO.longitude,
    },
    areaServed: {
      "@type": "Place",
      name: "Bali, Indonesia",
    },
    sameAs: [SITE_URL],
    priceRange: BUSINESS_PRICE_RANGE,
    currenciesAccepted: BUSINESS_CURRENCIES,
    paymentAccepted: BUSINESS_PAYMENT,
    openingHours: BUSINESS_HOURS,
  };
}

// ── JSON-LD: TouristAttraction (used in each destination/detail page) ─
export function buildTouristAttractionJsonLd({
  name,
  description,
  slug,
  image,
  price,
}: {
  name: string;
  description: string;
  slug: string;
  image?: string;
  price?: number;
}) {
  const pageUrl = `${SITE_URL}/detail/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description: description.substring(0, 300),
    url: pageUrl,
    ...(image && { image }),
    touristType: "Tourists",
    inLanguage: "en",
    isAccessibleForFree: false,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS_ADDRESS.locality,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    provider: {
      "@type": "TravelAgency",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(price && price > 0 && {
      offers: {
        "@type": "Offer",
        price: price.toString(),
        priceCurrency: "IDR",
        availability: "https://schema.org/InStock",
        url: pageUrl,
      },
    }),
  };
}
