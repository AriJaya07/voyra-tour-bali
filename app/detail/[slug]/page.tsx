import { Metadata } from "next";
import { Image as PrismaImage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import AboutDetail from "@/components/DetailProduct/AboutDetail";
import BannerDetail from "@/components/DetailProduct/BannerDetail";
import BookingLocalWidget from "@/components/booking/BookingLocalWidget";
import ExcpectDetail from "@/components/DetailProduct/ExpectDetail";
import ContentsSection from "@/components/DetailProduct/ContentsSection";
import LocationSection from "@/components/DetailProduct/LocationSection";
import PackagesSection from "@/components/DetailProduct/PackagesSection";
import {
  SITE_URL,
  SITE_NAME,
  buildTouristAttractionJsonLd,
} from "@/lib/config";

// ── SEO Metadata ────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const destination = await prisma.destination.findFirst({
        where: { slug },
        include: { images: { where: { isMain: true }, take: 1 } },
    });
    if (!destination) {
        return { title: "Destination Not Found" };
    }

    const description = destination.description.substring(0, 160);
    const mainImage = destination.images[0]?.url;

    return {
        title: `${destination.title} — Tickets & Booking`,
        description,
        alternates: {
            canonical: `${SITE_URL}/detail/${slug}`,
        },
        openGraph: {
            title: `${destination.title} — ${SITE_NAME}`,
            description,
            type: "article",
            url: `${SITE_URL}/detail/${slug}`,
            siteName: SITE_NAME,
            ...(mainImage && {
                images: [{ url: mainImage, width: 1200, height: 630, alt: destination.title }],
            }),
        },
        twitter: {
            card: "summary_large_image",
            title: `${destination.title} — ${SITE_NAME}`,
            description,
            ...(mainImage && { images: [mainImage] }),
        },
    };
}

// ── Page ────────────────────────────────────────────────────────────────
export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const destination = await prisma.destination.findFirst({
        where: { slug },
        include: {
            images: { orderBy: { order: "asc" } },
            category: true,
            contents: {
                include: { images: true },
                orderBy: { createdAt: "desc" },
            },
            locations: {
                include: { images: true },
            },
            packages: {
                include: {
                    images: { orderBy: { order: "asc" } },
                    category: true,
                },
                orderBy: { price: "asc" },
            },
        },
    });

    if (!destination) {
        return (
            <div className="flex flex-col justify-center items-center py-40 gap-4 text-center px-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Data is Empty</h2>
                <p className="text-gray-500 text-lg">We couldn&apos;t find the destination you&apos;re looking for.</p>
                <a
                    href="/"
                    className="mt-4 px-8 py-3 bg-[#00E7FF] text-white rounded-lg font-bold hover:bg-[#0097E8] transition-colors shadow-md"
                >
                    Explore Other Destinations
                </a>
            </div>
        );
    }

    const price = destination.price ?? 0;
    const mainImage =
        destination.images.find((img: PrismaImage) => img.isMain)?.url ||
        destination.images[0]?.url ||
        "";

    const contentImages = destination.contents
        .flatMap((c) => c.images.map((img) => img.url))
        .slice(0, 3);

    // JSON-LD: TouristAttraction — uses global helper from @/lib/config
    const touristAttractionJsonLd = buildTouristAttractionJsonLd({
        name: destination.title,
        description: destination.description,
        slug,
        image: mainImage || undefined,
        price,
    });

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(touristAttractionJsonLd) }}
            />
            {/* ── Banner ── */}
            <BannerDetail
                title={destination.title}
                description={destination.description}
                images={destination.images}
                categoryName={destination.category?.name || "Liburan"}
            />

            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
                    {/* ── Left: Product details ── */}
                    <div className="lg:col-span-2 space-y-0">
                        <AboutDetail
                            description={destination.description}
                            mainImage={mainImage}
                        />
                        <ContentsSection contents={destination.contents} />
                        <LocationSection locations={destination.locations} />
                        <PackagesSection
                            packages={destination.packages}
                            destinationTitle={destination.title}
                        />
                        <ExcpectDetail images={contentImages.length > 0 ? contentImages : undefined} />
                    </div>

                    {/* ── Right: Sticky booking card ── */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-24">
                            <BookingLocalWidget
                                price={price}
                                title={destination.title}
                                image={mainImage}
                                pricingCurrency="IDR"
                            />
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
