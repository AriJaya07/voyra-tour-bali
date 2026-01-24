import Container from "../../../components/Container"
import BackArrowIcon from "../../assets/detail/BackArrowIcon"

export default function BannerDetail() {
    return (
        <div className="">
            <div className="flex flex-col bg-[#00E7FF] gradient-to-r from-[#0097E8] pt-[10px] pb-[35px]">
                <Container>
                    <div className="">
                        <p className="text-[14px] leading-normal text-black flex gap-3 items-center">
                            <a href="/" target="_self" className=""><BackArrowIcon className="w-[25px] h-[35px]" /></a>   
                            Beranda  &gt; Liburan  &gt; GWK Bali
                        </p>
                    </div>
                    <div className="flex flex-col pt-[50px]">
                        <div className="flex flex-col pb-[20px]">
                            <p className="text-[24px] font-bold text-black leading-[24px] sm:text-[20px]">Garuda Wisnu Kencana Culture Park Ticket in Bali</p>
                            <p className="text-[14px] font-normal text-black leading-[24px] sm:text-[12px]">Explore the diverse culture Garuda Wisnu Kencana</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1">
                            {/* Image 1 (always visible) */}
                            <div className="w-full sm:w-[733px] h-[458px]">
                                <img src="/images/detail/banner-1.png" alt="" className="w-full h-full object-cover" />
                            </div>

                            {/* On mobile, show only one image */}
                            <div className="flex flex-col sm:hidden gap-1">
                                <img 
                                    src="/images/detail/banner-2.png" 
                                    alt="" 
                                    className="w-full h-[226px] object-cover" 
                                />
                            </div>

                            {/* On larger screens, show multiple images */}
                            <div className="hidden sm:flex sm:flex-col gap-1 sm:w-[362px] h-[458px]">
                                <img src="/images/detail/banner-2.png" alt="" className="w-full h-full object-cover" />
                                <img src="/images/detail/banner-3.png" alt="" className="w-full h-full object-cover" />
                            </div>

                            {/* On larger screens, show more images */}
                            <div className="hidden sm:flex sm:flex-col gap-1 sm:w-[362px] h-[458px]">
                                <img src="/images/detail/banner-4.png" alt="" className="w-full h-full object-cover" />
                                <img src="/images/detail/banner-5.png" alt="" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    )
}
