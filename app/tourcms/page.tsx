import type { Metadata } from "next";

import Container from "@/components/Container";
import { SITE_URL } from "@/lib/config";
import { listProducts } from "@/lib/services/tourcmsService";
import TourcmsListing from "@/components/tourcms/TourcmsListing";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "TourCMS Tours — Voyra",
  description:
    "Browse curated tours from our TourCMS partner network. Book secured experiences across Bali and beyond.",
  alternates: { canonical: "/tourcms" },
  openGraph: {
    type: "website",
    title: "TourCMS Tours — Voyra",
    description:
      "Browse curated tours from our TourCMS partner network.",
    url: `${SITE_URL}/tourcms`,
    siteName: "Voyra",
  },
};

export default async function TourcmsPage() {
  let firstPage: { items: { slug: string; title: string }[] } = { items: [] };
  try {
    firstPage = await listProducts({ page: 1, pageSize: 24 });
  } catch {
    // upstream unavailable — listing UI handles its own retry
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: firstPage.items.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/tourcms/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <Container className="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <TourcmsListing />
    </Container>
  );
}
