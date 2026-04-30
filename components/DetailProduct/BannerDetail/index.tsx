import { Image as PrismaImage } from "@prisma/client"
import Link from "next/link"
import Container from "../../../components/Container"
import BackArrowIcon from "../../assets/detail/BackArrowIcon"
import WishlistButton from "@/components/common/WishlistButton"
import ImageGalleryGrid from "./ImageGalleryGrid"

interface BannerDetailProps {
    title: string;
    description: string;
    images: PrismaImage[];
    categoryName: string;
    productCode?: string;
    href?: string;
    sourceCurrency?: string;
}

export default function BannerDetail({ title, description, images, categoryName, productCode, href, sourceCurrency }: BannerDetailProps) {
    const sortedImages = [...images].sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        if (a.order !== null && b.order !== null) return a.order - b.order;
        return 0;
    });

    return (
        <div className="">
            <div className="flex flex-col bg-[#00E7FF] gradient-to-r from-[#0097E8] pt-[10px] pb-[35px]">
                <Container>
                    <div className="">
                        <p className="text-[14px] leading-normal text-black flex gap-3 items-center">
                            <Link href="/" className=""><BackArrowIcon className="w-[25px] h-[35px]" /></Link>
                            Beranda  &gt; {categoryName}  &gt; {title}
                        </p>
                    </div>
                    <div className="flex flex-col pt-[50px]">
                        <div className="flex flex-col pb-[20px]">
                            <p className="text-[24px] font-bold text-black leading-[24px] sm:text-[20px]">{title}</p>
                            <p className="text-[14px] font-normal text-black leading-[24px] sm:text-[12px]">{description}</p>
                        </div>
                        <ImageGalleryGrid
                            images={sortedImages.map((img) => ({ url: img.url }))}
                            title={title}
                            heroOverlay={
                                productCode ? (
                                    <WishlistButton
                                        item={{
                                            productCode,
                                            source: "local",
                                            title,
                                            imageUrl: sortedImages[0]?.url,
                                            href,
                                            currency: sourceCurrency || "IDR",
                                        }}
                                    />
                                ) : null
                            }
                        />
                    </div>
                </Container>
            </div>
        </div>
    )
}
