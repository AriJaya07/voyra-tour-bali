import Link from "next/link";

import TourcmsEmptyState from "@/components/tourcms/TourcmsEmptyState";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <TourcmsEmptyState
        variant="no-data"
        title="Tour not found"
        description="This tour may have been removed by the partner, or the link is no longer valid. Browse our other Bali experiences below."
        action={
          <Link
            href="/tourcms"
            className="inline-block px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold hover:bg-[#005ba6]"
          >
            Browse all tours
          </Link>
        }
      />
    </div>
  );
}
