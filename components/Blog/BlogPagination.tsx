"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/Pagination";
import { useCallback } from "react";

export default function BlogPagination({ totalPages }: { totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      
      // Update URL without native scrolling
      router.push(pathname + "?" + params.toString(), { scroll: false });
      
      // Smoothly scroll to the blog list section
      const element = document.getElementById("blog-list");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    },
    [pathname, router, searchParams]
  );

  return (
    <Pagination 
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );
}
