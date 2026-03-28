import { Metadata } from "next"
import { getProductDetail } from "@/lib/data"
import ViatorProductClient from "@/components/viator/ViatorProductClient"

// ── SEO Metadata (noindex — Viator content must not be indexed) ────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productCode: string }>
}): Promise<Metadata> {
  const { productCode } = await params
  const product = await getProductDetail(productCode)

  if (!product) {
    return { title: "Activity Not Found", robots: { index: false, follow: false } }
  }

  return {
    title: `${product.title} — Book Now`,
    description: product.description || `Book ${product.title} in Bali.`,
    robots: {
      index: false,
      follow: false,
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

  return <ViatorProductClient productCode={productCode} />
}
