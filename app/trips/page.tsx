import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import TripsClient, { type Itinerary } from "./TripsClient";

export const dynamic = "force-dynamic";

export default async function ItinerariesListPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userId = parseInt(session.user.id);
  if (Number.isNaN(userId)) {
    redirect("/login");
  }

  const rows = await prisma.savedItinerary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fromDate: true,
      toDate: true,
      visibility: true,
      shareSlug: true,
      createdAt: true,
    },
  });

  const initialItems: Itinerary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    fromDate: r.fromDate ? r.fromDate.toISOString() : null,
    toDate: r.toDate ? r.toDate.toISOString() : null,
    visibility: r.visibility as "PRIVATE" | "PUBLIC",
    shareSlug: r.shareSlug,
    createdAt: r.createdAt.toISOString(),
  }));

  return <TripsClient initialItems={initialItems} />;
}
