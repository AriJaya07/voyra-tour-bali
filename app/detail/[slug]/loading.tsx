export default function Loading() {
    return (
        <div className="flex flex-col justify-center items-center py-40 min-h-[50vh] gap-4">
            {/* Spinning Circle */}
            <div className="w-16 h-16 border-4 border-[#E6E6E6] border-t-[#00E7FF] rounded-full animate-spin"></div>
            <p className="text-[#333333] font-medium text-lg animate-pulse">Loading destination details...</p>
        </div>
    )
}
