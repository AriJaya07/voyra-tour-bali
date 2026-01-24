export default function ExcpectDetail() {
    return (
        <div className="pt-[79px] px-4 sm:px-8">
            <div className="flex flex-col gap-5">
                <div className="flex flex-row gap-3 items-center">
                    <hr className="h-10 bg-[#02ACBE] w-[5px]" />
                    <p className="text-[24px] font-bold leading-[24px] text-black sm:text-[28px]">What to expect</p>
                </div>
                {/* Responsive Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-center">
                    <img src={"/images/detail/recommend/recommend-1.png"} alt="recommendation 1" className="w-full h-auto object-cover" />
                    <img src={"/images/detail/recommend/recommend-2.png"} alt="recommendation 2" className="w-full h-auto object-cover" />
                    <img src={"/images/detail/recommend/recommend-3.png"} alt="recommendation 3" className="w-full h-auto object-cover" />
                </div>
            </div>
        </div>
    )
}
