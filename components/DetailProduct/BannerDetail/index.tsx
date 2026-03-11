import { Image as PrismaImage } from "@prisma/client"
import Container from "../../../components/Container"
import BackArrowIcon from "../../assets/detail/BackArrowIcon"

interface BannerDetailProps {
    title: string;
    description: string;
    images: PrismaImage[];
    categoryName: string;
}

export default function BannerDetail({ title, description, images, categoryName }: BannerDetailProps) {
    // Sort images by order if exists, otherwise by isMain
    const sortedImages = [...images].sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        if (a.order !== null && b.order !== null) return a.order - b.order;
        return 0;
    });

    const img1 = sortedImages[0]?.url || "/images/detail/banner-1.png";
    const img2 = sortedImages[1]?.url || "/images/detail/banner-2.png";
    const img3 = sortedImages[2]?.url || "/images/detail/banner-3.png";
    const img4 = sortedImages[3]?.url || "/images/detail/banner-4.png";
    const img5 = sortedImages[4]?.url || "/images/detail/banner-5.png";

    return (
        <div className="">
            <div className="flex flex-col bg-[#00E7FF] gradient-to-r from-[#0097E8] pt-[10px] pb-[35px]">
                <Container>
                    <div className="">
                        <p className="text-[14px] leading-normal text-black flex gap-3 items-center">
                            <a href="/" target="_self" className=""><BackArrowIcon className="w-[25px] h-[35px]" /></a>   
                            Beranda  &gt; {categoryName}  &gt; {title}
                        </p>
                    </div>
                    <div className="flex flex-col pt-[50px]">
                        <div className="flex flex-col pb-[20px]">
                            <p className="text-[24px] font-bold text-black leading-[24px] sm:text-[20px]">{title}</p>
                            <p className="text-[14px] font-normal text-black leading-[24px] sm:text-[12px]">{description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1">
                            {/* Image 1 (always visible) */}
                            <div className="w-full sm:w-[733px] h-[458px]">
                                <img src={img1} alt={title} className="w-full h-full object-cover" />
                            </div>

                            {/* On mobile, show only one image */}
                            <div className="flex flex-col sm:hidden gap-1">
                                <img 
                                    src={img2} 
                                    alt={title} 
                                    className="w-full h-[226px] object-cover" 
                                />
                            </div>

                            {/* On larger screens, show multiple images */}
                            <div className="hidden sm:flex sm:flex-col gap-1 sm:w-[362px] h-[458px]">
                                <img src={img2} alt={title} className="w-full h-[229px] object-cover" />
                                <img src={img3} alt={title} className="w-full h-[225px] object-cover" />
                            </div>

                            {/* On larger screens, show more images */}
                            <div className="hidden sm:flex sm:flex-col gap-1 sm:w-[362px] h-[458px]">
                                <img src={img4} alt={title} className="w-full h-[229px] object-cover" />
                                <img src={img5} alt={title} className="w-full h-[225px] object-cover" />
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    )
}

