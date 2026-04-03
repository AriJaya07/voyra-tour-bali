import { BlogCardSkeleton } from "@/components/Blog/LoadingSkeleton";
import SectionHeader from "@/components/Blog/SectionHeader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-20">
      <div className="container mx-auto px-4">
        <SectionHeader title="Discover Bali" subtitle="Loading latest insights and destination guides..." centered />
        
        <div className="mt-16 mb-8 h-12 w-full max-w-xl mx-auto rounded-full bg-gray-200 animate-pulse"></div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 mt-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
