import { Metadata } from "next"
import { getProductDetail } from "@/lib/data"
import ViatorProductClient from "@/components/viator/ViatorProductClient"

const SITE_URL = process.env.NEXTAUTH_URL || "https://voyra-tour-bali.vercel.app"

// ── SEO Metadata (server-side) ──────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productCode: string }>
}): Promise<Metadata> {
  const { productCode } = await params
  const product = await getProductDetail(productCode)

  if (!product) {
    return { title: "Activity Not Found" }
  }

  const description = product.description || `Book ${product.title} in Bali. Secure booking with Voyra Tourism.`

  return {
    title: `${product.title} — Book Now`,
    description,
    openGraph: {
      title: `${product.title} — Voyra Bali Tour`,
      description,
      type: "article",
      url: `${SITE_URL}/viator/${productCode}`,
      ...(product.imageUrl && {
        images: [{ url: product.imageUrl, width: 1200, height: 630, alt: product.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} — Voyra Bali Tour`,
      description,
      ...(product.imageUrl && { images: [product.imageUrl] }),
    },
  }
}

// ── Page (server component → renders client component) ──────────────────

export default async function ViatorProductPage({
  params,
}: {
  params: Promise<{ productCode: string }>
}) {
  const { productCode } = await params

  // Fetch product server-side for JSON-LD structured data
  const product = await getProductDetail(productCode)

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        name: product.title,
        description: product.description,
        image: product.imageUrl,
        url: `${SITE_URL}/viator/${productCode}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Bali",
          addressCountry: "ID",
        },
        ...(product.price > 0 && {
          offers: {
            "@type": "Offer",
            priceCurrency: product.currency,
            price: product.price,
            availability: "https://schema.org/InStock",
          },
        }),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ViatorProductClient productCode={productCode} />
    </>
  )
}
