import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import { Destination } from "@/types/blog";
import { getCardImage, getCategoryName, getLocationText, getSummary } from "@/lib/newsApi";
import { CalendarIcon, MapPinIcon, ArrowRightIcon } from "@/components/assets/Icon/shared";

export default function BlogCard({ blog }: { blog: Destination }) {
  const categoryName = getCategoryName(blog);
  const locationText = getLocationText(blog.location);

  return (
    <Link
      href={`/blog/${blog.id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 "
    >
      <div className="relative h-64 w-full overflow-hidden">
        <OptimizedImage
          src={getCardImage(blog)}
          alt={blog.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {categoryName && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-blue-600 px-3 py-1 text-xs font-semibold rounded-full shadow-sm">
            {categoryName}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4 ">
          {blog.createdAt && (
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-1" />
              {new Date(blog.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
          {locationText && (
            <div className="flex items-center">
              <MapPinIcon className="w-4 h-4 mr-1" />
              <span className="truncate max-w-[120px]">{locationText}</span>
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors ">
          {blog.title}
        </h3>
        
        <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow ">
          {getSummary(blog)}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center text-sm font-semibold text-amber-500 group-hover:text-amber-600 ">
          Read More
          <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
