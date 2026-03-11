interface AboutDetailProps {
    description: string;
    mainImage: string;
}

export default function AboutDetail({ description, mainImage }: AboutDetailProps) {
    return (
        <div className="pt-[57px]">
            <div className="flex flex-col">
                <div className="mb-[20px] px-[16px] sm:px-[32px]">
                    <h1 className="text-[32px] text-black font-bold leading-[40px] sm:text-[28px] sm:leading-[36px]">
                        About Destination
                    </h1>
                </div>
                <div className="flex flex-col sm:flex-row bg-gradient-to-r from-[#01ACBB] to-[#C4E6E9] p-[20px] sm:p-[40px] rounded-lg">
                    <div className="text-[14px] sm:text-[16px] text-black leading-[22px] sm:leading-[28px] mb-[20px] sm:mb-0 sm:w-[50%] px-[16px]">
                        <p className="mb-[16px whitespace-pre-line]">
                            {description}
                        </p>
                    </div>
                    <div className="w-full sm:w-[50%]">
                        <img src={mainImage || "/images/detail/main-detail.png"} alt="Destination" className="w-full h-[400px] object-cover rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    )
}

