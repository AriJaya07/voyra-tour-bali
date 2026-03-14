// Next.js automatically renders this file while app/detail/[slug]/page.tsx is loading.
// This prevents the footer from appearing above the content during data fetching.

export default function Loading() {
  return (
    <div className="animate-pulse">

      {/* ── Banner Skeleton ── */}
      <div className="flex flex-col bg-[#00E7FF] pb-[35px] pt-[10px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Breadcrumb skeleton */}
          <div className="h-4 w-64 bg-white/40 rounded mb-10 mt-2" />

          {/* Title skeleton */}
          <div className="space-y-2 mb-5">
            <div className="h-7 w-72 bg-white/40 rounded" />
            <div className="h-4 w-96 bg-white/30 rounded" />
          </div>

          {/* Image grid skeleton */}
          <div className="flex flex-col sm:flex-row gap-1">
            {/* Main image */}
            <div className="w-full sm:w-[733px] h-[458px] bg-white/30 rounded" />
            {/* Side images (desktop only) */}
            <div className="hidden sm:flex flex-col gap-1 sm:w-[362px] h-[458px]">
              <div className="w-full h-[229px] bg-white/30 rounded" />
              <div className="w-full h-[225px] bg-white/30 rounded" />
            </div>
            <div className="hidden sm:flex flex-col gap-1 sm:w-[362px] h-[458px]">
              <div className="w-full h-[229px] bg-white/20 rounded" />
              <div className="w-full h-[225px] bg-white/20 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body Skeleton ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">

        {/* About skeleton */}
        <div className="pt-[57px] mb-10">
          <div className="h-8 w-56 bg-gray-200 rounded mb-6" />
          <div className="flex flex-col sm:flex-row gap-6 bg-gradient-to-r from-[#01ACBB]/20 to-[#C4E6E9]/20 p-6 sm:p-10 rounded-lg">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
            <div className="w-full sm:w-1/2 h-[220px] sm:h-[400px] bg-gray-200 rounded-lg" />
          </div>
        </div>

        {/* Packages skeleton */}
        <div className="pt-[72px] mb-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-[5px] bg-gray-200 rounded-full" />
            <div>
              <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-56 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="h-[200px] bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 rounded-full" />
                  <div className="h-5 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-100 rounded" />
                  <div className="h-4 w-4/6 bg-gray-100 rounded" />
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                    <div className="h-6 w-28 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-xl mt-2" />
                    <div className="h-10 w-full bg-green-100 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking skeleton */}
        <div className="mt-[88px] border border-gray-200 rounded-[16px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-6 w-20 bg-green-100 rounded-full" />
          </div>
          <div className="h-4 w-72 bg-gray-100 rounded mb-6" />
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Calendar */}
            <div className="sm:w-1/2 h-[280px] bg-gray-100 rounded-lg" />
            {/* Right panel */}
            <div className="sm:w-1/2 space-y-4">
              <div className="border border-gray-200 rounded-xl p-4 h-20 bg-gray-50" />
              <div className="border border-gray-200 rounded-xl p-4 h-16 bg-gray-50" />
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-12 bg-gray-200 rounded-xl" />
                <div className="h-12 bg-green-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
