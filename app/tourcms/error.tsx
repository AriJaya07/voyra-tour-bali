"use client";

import Link from "next/link";

import TourcmsEmptyState from "@/components/tourcms/TourcmsEmptyState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <TourcmsEmptyState
        variant="error"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold hover:bg-[#005ba6]"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-5 py-2 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
            >
              Back home
            </Link>
          </div>
        }
      />
    </div>
  );
}
