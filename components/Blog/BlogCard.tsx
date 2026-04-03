import Image from "next/image";
import Link from "next/link";
import { Destination } from "@/types/blog";
import { getImageUrl } from "@/lib/newsApi";
import { HiOutlineCalendarDays, HiOutlineMapPin } from "react-icons/hi2";

export default function BlogCard({ blog }: { blog: Destination }) {
  return (
    <Link
      href={`/blog/${blog.id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 "
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={getImageUrl(blog.image)}
          alt={blog.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {blog.categoryName && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-blue-600 px-3 py-1 text-xs font-semibold rounded-full shadow-sm">
            {blog.categoryName}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4 ">
          {blog.createdAt && (
            <div className="flex items-center">
              <HiOutlineCalendarDays className="w-4 h-4 mr-1" />
              {new Date(blog.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
          {blog.location && (
            <div className="flex items-center">
              <HiOutlineMapPin className="w-4 h-4 mr-1" />
              <span className="truncate max-w-[120px]">{typeof blog.location === 'string' ? blog.location : blog.location.title || blog.location.address}</span>
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors ">
          {blog.title}
        </h3>
        
        <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow ">
          {blog.description}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center text-sm font-semibold text-amber-500 group-hover:text-amber-600 ">
          Read More
          <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
