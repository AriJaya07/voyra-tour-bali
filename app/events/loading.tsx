import { EventCardSkeleton } from "@/components/Blog/LoadingSkeleton";
import SectionHeader from "@/components/Blog/SectionHeader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader 
          title="Bali Events Calendar" 
          subtitle="Loading upcoming events and schedules..."
        />
        
        <div className="flex flex-col space-y-6 mt-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
