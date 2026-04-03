export const SkeletonTranding = () => {
    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm h-[280px] flex flex-col animate-pulse">
            {/* Image skeleton */}
            <div className="relative w-full aspect-[4/3] bg-gray-200" />

            {/* Content skeleton */}
            <div className="p-3 flex flex-col flex-1 space-y-2">
                {/* Title */}
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-3/5" />

                {/* Rating & duration */}
                <div className="h-3 bg-gray-100 rounded w-2/3 mt-1" />

                {/* Price */}
                <div className="mt-auto space-y-1">
                <div className="h-3 bg-gray-100 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
            </div>
        </div>
    )
}