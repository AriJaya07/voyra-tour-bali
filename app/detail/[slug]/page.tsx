import { Metadata } from "next";
import { Image as PrismaImage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import AboutDetail from "@/components/DetailProduct/AboutDetail";
import BannerDetail from "@/components/DetailProduct/BannerDetail";
import BookingUser from "@/components/DetailProduct/BookingUser";
import ExcpectDetail from "@/components/DetailProduct/ExpectDetail";
import ContentsSection from "@/components/DetailProduct/ContentsSection";
import LocationSection from "@/components/DetailProduct/LocationSection";
import PackagesSection from "@/components/DetailProduct/PackagesSection";

// ── SEO Metadata ────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const destination = await prisma.destination.findFirst({ where: { slug: params.slug } });
    if (!destination) {
        return { title: "Destination Not Found | Voyra Turism" };
    }
    return {
        title: `${destination.title} Tickets & Booking | Voyra Turism`,
        description: destination.description.substring(0, 160) + "...",
        openGraph: {
            title: `${destination.title} | Voyra Turism`,
            description: destination.description.substring(0, 160),
        }
    };
}

// ── Page ────────────────────────────────────────────────────────────────
export default async function Detail({ params }: { params: { slug: string } }) {
    const slug = params.slug;

    // Fetch destination + all related tables in one query
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

    // Empty / not found state
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

    // Build list of content images to pass to ExpectDetail
    const contentImages = destination.contents
        .flatMap((c) => c.images.map((img) => img.url))
        .slice(0, 3);

    return (
        <div>
            {/* ── Banner ── */}
            <BannerDetail
                title={destination.title}
                description={destination.description}
                images={destination.images}
                categoryName={destination.category?.name || "Liburan"}
            />

            <Container>
                {/* ── About ── */}
                <AboutDetail
                    description={destination.description}
                    mainImage={mainImage}
                />

                {/* ── Contents / Highlights ── */}
                <ContentsSection contents={destination.contents} />

                {/* ── Locations ── */}
                <LocationSection locations={destination.locations} />

                {/* ── Packages ── */}
                <PackagesSection
                    packages={destination.packages}
                    destinationTitle={destination.title}
                />

                {/* ── What to Expect (images from content) ── */}
                <ExcpectDetail images={contentImages.length > 0 ? contentImages : undefined} />

                {/* ── Booking ── */}
                <BookingUser price={price} title={destination.title} />
            </Container>
        </div>
    );
}