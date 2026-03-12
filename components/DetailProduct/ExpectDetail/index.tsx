interface ExcpectDetailProps {
    images?: string[];
}

export default function ExcpectDetail({ images }: ExcpectDetailProps) {
    const defaultImages = [
        "/images/detail/recommend/recommend-1.png",
        "/images/detail/recommend/recommend-2.png",
        "/images/detail/recommend/recommend-3.png"
    ];
    
    const displayImages = images?.length ? images : defaultImages;

    return (
        <div className="pt-[79px] px-4 sm:px-8">
            <div className="flex flex-col gap-5">
                <div className="flex flex-row gap-3 items-center">
                    <hr className="h-10 bg-[#02ACBE] w-[5px]" />
                    <p className="text-[24px] font-bold leading-[24px] text-black sm:text-[28px]">What to expect</p>
                </div>
                {/* Responsive Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-center">
                    {displayImages.slice(0, 3).map((img, index) => (
                        <img key={index} src={img} alt={`recommendation ${index + 1}`} className="w-full h-auto object-cover rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    )
}

