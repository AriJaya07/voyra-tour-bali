export function BlogCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse ">
      <div className="h-64 w-full bg-gray-200 "></div>
      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3 "></div>
        <div className="h-6 bg-gray-200 rounded w-full "></div>
        <div className="h-6 bg-gray-200 rounded w-5/6 "></div>
        <div className="flex-grow"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 pt-4 mt-auto "></div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse ">
      <div className="h-60 md:h-full w-full bg-gray-200 col-span-1 "></div>
      <div className="p-6 md:p-8 flex flex-col justify-center col-span-1 md:col-span-2 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4 "></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 "></div>
        <div className="h-4 bg-gray-200 rounded w-full "></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 "></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-4 "></div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-3/4 mb-6 "></div>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-10 "></div>
      <div className="h-[400px] bg-gray-200 rounded-2xl w-full mb-10 "></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full "></div>
        <div className="h-4 bg-gray-200 rounded w-full "></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 "></div>
        <div className="h-4 bg-gray-200 rounded w-full "></div>
        <div className="h-4 bg-gray-200 rounded w-4/5 "></div>
      </div>
    </div>
  );
}
