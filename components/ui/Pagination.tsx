"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/assets/Icon/shared";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: always show first, last, current, and neighbors
  const pages: (number | "...")[] = [];
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };

  addPage(1);

  if (currentPage > 3) pages.push("...");

  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 1 && i < totalPages) addPage(i);
  }

  if (currentPage < totalPages - 2) pages.push("...");

  addPage(totalPages);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-6">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#0071CE] hover:text-[#0071CE] transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500"
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition ${
              page === currentPage
                ? "bg-[#0071CE] text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:border-[#0071CE] hover:text-[#0071CE]"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#0071CE] hover:text-[#0071CE] transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500"
        aria-label="Next page"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
