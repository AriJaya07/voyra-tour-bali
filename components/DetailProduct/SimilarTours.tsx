import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { prisma } from "@/lib/prisma";
import WishlistButton from "@/components/common/WishlistButton";
import PriceLabel from "@/components/common/PriceLabel";

interface Props {
  destinationId: number;
  categoryId?: number | null;
  limit?: number;
}

export default async function SimilarTours({ destinationId, categoryId, limit = 6 }: Props) {
  // Same-category first, fallback to other recent destinations
  const sameCategory = categoryId
    ? await prisma.destination.findMany({
        where: { id: { not: destinationId }, categoryId },
        include: { images: { where: { isMain: true }, take: 1 } },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    : [];

  let results = sameCategory;
  if (results.length < limit) {
    const fillers = await prisma.destination.findMany({
      where: {
        id: {
          notIn: [destinationId, ...sameCategory.map((d) => d.id)],
        },
      },
      include: { images: { where: { isMain: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: limit - results.length,
    });
    results = [...results, ...fillers];
  }

  if (results.length === 0) return null;

  return (
    <section className="py-8 border-t border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">You may also like</h2>
      <p className="text-sm text-gray-500 mb-4">Travelers who viewed this also enjoyed these tours.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {results.map((d) => {
          const img = d.images[0]?.url;
          const slug = d.slug || String(d.id);
          const href = `/detail/${slug}`;
          return (
            <Link
              key={d.id}
              href={href}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition group"
            >
              <div className="relative aspect-[4/3] bg-gray-100">
                {img ? (
                  <OptimizedImage src={img} alt={d.title} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100" />
                )}
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
                  <WishlistButton
                    size="sm"
                    item={{
                      productCode: `LOCAL-${slug}`,
                      source: "local",
                      title: d.title,
                      imageUrl: img,
                      price: d.price ?? null,
                      currency: "IDR",
                      href,
                    }}
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[40px] group-hover:text-[#0071CE] transition">
                  {d.title}
                </p>
                {d.price && d.price > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    From{" "}
                    <PriceLabel
                      amount={d.price}
                      sourceCurrency="IDR"
                      className="font-bold text-gray-900"
                    />
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
