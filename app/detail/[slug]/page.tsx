import { Metadata } from "next";
import { Image as PrismaImage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import AboutDetail from "@/components/DetailProduct/AboutDetail";
import BannerDetail from "@/components/DetailProduct/BannerDetail";
import BookingUser from "@/components/DetailProduct/BookingUser";
import ExcpectDetail from "@/components/DetailProduct/ExpectDetail";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const slug = params.slug;
    const destination = await prisma.destination.findFirst({
        where: { slug }
    });

    if (!destination) {
        return {
            title: "Destination Not Found | Voyra Turism",
            description: "The requested destination could not be found."
        }
    }

    return {
        title: `${destination.title} Tickets & Booking | Voyra Turism`,
        description: destination.description.substring(0, 160) + "..."
    }
}

export default async function Detail({ params }: { params: { slug: string } }) {
    const slug = params.slug;

    // Fetch the destination by slug using findFirst (safest for optional unique fields)
    const destination = await prisma.destination.findFirst({
        where: { slug },
        include: {
            images: true,
            category: true,
        },
    });

    if (!destination) {
        return (
            <div className="flex flex-col justify-center items-center py-40 gap-4 text-center px-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Data is Empty</h2>
                <p className="text-gray-500 text-lg">We couldn't find the destination you're looking for.</p>
                <a href="/" className="mt-4 px-8 py-3 bg-[#00E7FF] text-white rounded-lg font-bold hover:bg-[#0097E8] transition-colors shadow-md">
                    Explore Other Destinations
                </a>
            </div>
        );
    }

    // Default price to 0 if null, or handle differently if needed
    const price = destination.price ?? 0;

    return (
        <div className="">
            <BannerDetail 
                title={destination.title} 
                description={destination.description} 
                images={destination.images} 
                categoryName={destination.category?.name || "Liburan"} 
            />
            <Container>
                <AboutDetail 
                    description={destination.description} 
                    mainImage={destination.images.find((img: PrismaImage) => img.isMain)?.url || destination.images[0]?.url || ""} 
                />
                <BookingUser 
                    price={price} 
                    title={destination.title} 
                />
                <ExcpectDetail />
            </Container>
        </div>
    )
}