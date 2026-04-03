import Image from "next/image";
import Link from "next/link";
import { EventItem } from "@/types/blog";
import { getImageUrl } from "@/lib/newsApi";
import { HiOutlineCalendarDays, HiOutlineMapPin } from "react-icons/hi2";

export default function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group grid grid-cols-1 md:grid-cols-3 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 "
    >
      <div className="relative h-60 md:h-full w-full overflow-hidden col-span-1">
        <Image
          src={getImageUrl(event.image)}
          alt={event.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm flex flex-col items-center justify-center min-w-[3rem]">
          <span className="uppercase text-[10px] leading-tight opacity-90">Up</span>
          <span className="leading-tight">Next</span>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col justify-center col-span-1 md:col-span-2">
        <div className="flex flex-wrap items-center text-sm text-indigo-600 font-semibold mb-3 space-x-1 ">
          {event.schedule && (
            <div className="flex items-center mr-4 mb-2">
              <HiOutlineCalendarDays className="w-5 h-5 mr-1.5" />
              {event.schedule}
            </div>
          )}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors ">
          {event.title}
        </h3>
        
        <p className="text-gray-600 mb-4 line-clamp-2 ">
          {event.description}
        </p>
        
        {event.location && (
          <div className="flex items-center text-sm text-gray-500 mt-auto ">
            <HiOutlineMapPin className="w-5 h-5 mr-1.5" />
            {typeof event.location === 'string' ? event.location : event.location.title || event.location.address}
          </div>
        )}
      </div>
    </Link>
  );
}
