import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h2 className="text-xl font-bold">Tour not found</h2>
      <p className="text-sm text-gray-500">
        This tour may have been removed by the partner.
      </p>
      <Link
        href="/tourcms"
        className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold"
      >
        Browse all TourCMS tours
      </Link>
    </div>
  );
}
