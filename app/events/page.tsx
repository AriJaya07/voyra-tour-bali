import { Metadata } from 'next';
import { getAllEvents } from '@/lib/newsApi';
import EventCard from '@/components/Blog/EventCard';
import SectionHeader from '@/components/Blog/SectionHeader';
import ErrorState from '@/components/Blog/ErrorState';

export const metadata: Metadata = {
  title: 'Upcoming Events in Bali | Bali Travel Now',
  description: 'Find out the latest and most exciting events happening in Bali. Plan your itinerary with our events guide.',
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getAllEvents();

  if (!events) {
    return (
      <div className="container mx-auto px-4 py-16">
        <ErrorState />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <SectionHeader 
            title="Bali Events Calendar" 
            subtitle="Discover exciting festivals, cultural ceremonies, and parties happening around Bali."
          />
        </div>

        {events.length > 0 ? (
          <div className="flex flex-col space-y-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 ">
             <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
            <p className="text-gray-500 ">Check back later for new events in Bali.</p>
          </div>
        )}
      </div>
    </main>
  );
}
