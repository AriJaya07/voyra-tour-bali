"use client";

import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h2 className="text-xl font-bold">Could not load TourCMS tours</h2>
      <p className="text-sm text-gray-500 max-w-md">
        Our partner data feed is temporarily unavailable. Please try again in a
        moment.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold"
        >
          Retry
        </button>
        <Link
          href="/"
          className="px-5 py-2 border border-gray-300 rounded-lg font-bold"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
