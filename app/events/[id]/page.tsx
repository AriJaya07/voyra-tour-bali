import { Metadata } from 'next';
import Link from 'next/link';
import OptimizedImage from "@/components/common/OptimizedImage";
import { notFound } from 'next/navigation';
import { getEventDetail, getImageUrl, getCardImage, getLocationText, getSummary } from '@/lib/newsApi';
import { CalendarIcon, MapPinIcon, ChevronLeftIcon } from "@/components/assets/Icon/shared";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params;
  const event = await getEventDetail(p.id);

  if (!event) {
    return {
      title: 'Event Not Found | Bali Travel Now',
    };
  }

  return {
    title: `${event.title} | Bali Events`,
    description: getSummary(event),
    openGraph: {
      images: [getCardImage(event)],
    },
  };
}

export const revalidate = 60;

export default async function EventDetailPage({ params }: PageProps) {
  const p = await params;
  const event = await getEventDetail(p.id);

  if (!event) {
    notFound();
  }

  const locationText = getLocationText(event.location);

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-20">
      <div className="container mx-auto px-4 max-w-4xl">
        
        <Link href="/events" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-8 font-medium transition-colors :text-indigo-400">
          <ChevronLeftIcon className="w-5 h-5 mr-1" />
          Back to Events
        </Link>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Banner */}
          <div className="relative h-[400px] w-full">
            <OptimizedImage
              src={getImageUrl(event.imageBanner || event.image)}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <span>{event.schedule}</span>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              {event.title}
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 mb-10 pb-10 border-b border-gray-100 ">
              {locationText && (
                <div className="flex items-center text-gray-600 ">
                  <div className="bg-indigo-50 p-3 rounded-full mr-4">
                    <MapPinIcon className="w-6 h-6 text-indigo-600 " />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">Location</div>
                    <div className="font-semibold">{locationText}</div>
                  </div>
                </div>
              )}
              
              {event.schedule && (
                <div className="flex items-center text-gray-600 ">
                  <div className="bg-indigo-50 p-3 rounded-full mr-4">
                    <CalendarIcon className="w-6 h-6 text-indigo-600 " />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">Date & Time</div>
                    <div className="font-semibold">{event.schedule}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xl text-gray-600 mb-10 font-medium leading-relaxed">
              {getSummary(event)}
            </div>
            
            <article 
              className="prose prose-lg max-w-none prose-img:rounded-2xl prose-img:shadow-md prose-headings:text-indigo-900 hover:prose-a:text-indigo-600 prose-a:text-indigo-500"
              dangerouslySetInnerHTML={{ __html: event.content || "" }}
            />
          </div>
        </div>

      </div>
    </main>
  );
}
