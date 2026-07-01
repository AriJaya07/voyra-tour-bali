import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import TripsClient, { type Itinerary } from "./TripsClient";
import TripsSignedOut from "@/components/trips/TripsSignedOut";

export const dynamic = "force-dynamic";

export default async function ItinerariesListPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <TripsSignedOut variant="trips" />;
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
