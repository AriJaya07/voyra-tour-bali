import OptimizedImage from "@/components/common/OptimizedImage"
import { Image as PrismaImage } from "@prisma/client"

interface ExcpectDetailProps {
    images: PrismaImage[];
}

export default function ExcpectDetail({ images }: ExcpectDetailProps) {
    // 1. Safety check and Sorting (Banner uses first 5, so we ideally start from index 5)
    const sortedImages = images ? [...images].sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        if (a.order !== null && b.order !== null) return a.order - b.order;
        return 0;
    }) : [];

    const displayImages = sortedImages.length > 5
        ? sortedImages.slice(5, 8)
        : sortedImages.slice(0, 3);

    if (displayImages.length === 0) return null;


    return (
        <div className="pt-[79px] px-4 sm:px-8">
            <div className="flex flex-col gap-5">
                <div className="flex flex-row gap-3 items-center">
                    <hr className="h-10 bg-[#02ACBE] w-[5px]" />
                    <p className="text-[24px] font-bold leading-[24px] text-black sm:text-[28px]">What to expect</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-center">
                    {displayImages.map((img, index) => (
                        <div key={img.id || index} className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
                            <OptimizedImage
                                src={img.url}
                                alt={img.altText || "What to expect"}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
