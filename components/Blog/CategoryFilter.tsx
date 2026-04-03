"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Category } from "@/types/blog";
import { useCallback } from "react";

export default function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategoryId = searchParams.get("categoryId");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleCategoryClick = (categoryId: string) => {
    router.push(pathname + "?" + createQueryString("categoryId", categoryId), { scroll: false });
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full relative py-2">
      <div className="flex space-x-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => handleCategoryClick("")}
          className={`shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
            !currentCategoryId
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 :bg-slate-700"
          }`}
        >
          All
        </button>
        
        {categories.map((category) => {
          const isActive = currentCategoryId === String(category.id);
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(String(category.id))}
              className={`shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 :bg-slate-700"
              }`}
            >
              {category.displayCat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
