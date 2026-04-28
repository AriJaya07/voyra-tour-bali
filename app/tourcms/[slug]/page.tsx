import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import { SITE_URL } from "@/lib/config";
import { getProductBySlug } from "@/lib/services/tourcmsService";
import TourcmsProductClient from "@/components/tourcms/TourcmsProductClient";
import type { TourcmsProductDetail } from "@/types/tourcms";

function buildJsonLd(slug: string, p: TourcmsProductDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: p.title,
    description: p.shortDescription || p.description || undefined,
    image: p.images.map((i) => i.url).filter(Boolean),
    touristType: "Leisure",
    provider: { "@type": "Organization", name: "Voyra (TourCMS)" },
    offers: p.fromPrice
      ? {
          "@type": "Offer",
          price: p.fromPrice,
          priceCurrency: p.currencyCode || "USD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/tourcms/${slug}`,
        }
      : undefined,
    aggregateRating:
      p.rating && p.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
          }
        : undefined,
  };
}

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Tour not found — Voyra" };

  const title = `${product.title} — TourCMS · Voyra`;
  const description =
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    "Book this tour via Voyra.";
  const url = `${SITE_URL}/tourcms/${slug}`;
  const heroImage = product.images[0]?.url || product.imageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: "Voyra",
      images: heroImage ? [{ url: heroImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function TourcmsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const jsonLd = buildJsonLd(slug, product);

  return (
    <Container className="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TourcmsProductClient product={product} />
    </Container>
  );
}
