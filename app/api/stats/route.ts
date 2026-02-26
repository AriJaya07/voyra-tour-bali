import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Parallel queries untuk performa optimal
    const [
      totalCategories,
      totalDestinations,
      totalPackages,
      totalImages,
      recentDestinations,
      recentPackages,
      packagesByCategory,
      destinationsByCategory,
      topPackages,
    ] = await Promise.all([
      // ── Counts ──────────────────────────────────────────
      prisma.category.count(),
      prisma.destination.count(),
      prisma.package.count(),
      prisma.image.count(),

      // ── Recent Destinations (5 terbaru) ─────────────────
      prisma.destination.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          price: true,
          createdAt: true,
          category: { select: { name: true, slug: true } },
          _count: { select: { images: true } },
        },
      }),

      // ── Recent Packages (5 terbaru) ──────────────────────
      prisma.package.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          price: true,
          createdAt: true,
          category: { select: { name: true } },
          destination: { select: { title: true } },
          _count: { select: { images: true } },
        },
      }),

      // ── Packages per Category (untuk chart) ──────────────
      prisma.category.findMany({
        select: {
          name: true,
          slug: true,
          _count: {
            select: { packages: true, destinations: true },
          },
        },
        orderBy: { name: "asc" },
      }),

      // ── Destinations per Category ─────────────────────────
      prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { destinations: true } },
        },
      }),

      // ── Top Packages by Price ─────────────────────────────
      prisma.package.findMany({
        take: 5,
        orderBy: { price: "desc" },
        select: {
          id: true,
          title: true,
          price: true,
          category: { select: { name: true } },
          destination: { select: { title: true } },
        },
      }),
    ]);

    // ── Total value semua packages ─────────────────────────
    const packageValueAgg = await prisma.package.aggregate({
      _sum: { price: true },
      _avg: { price: true },
      _max: { price: true },
      _min: { price: true },
    });

    const destinationValueAgg = await prisma.destination.aggregate({
      _sum: { price: true },
      _avg: { price: true },
    });

    // ── Packages dibuat per bulan (6 bulan terakhir) ───────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const packagesPerMonth = await prisma.package.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const destinationsPerMonth = await prisma.destination.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by month
    const monthlyData = buildMonthlyData(packagesPerMonth, destinationsPerMonth);

    return NextResponse.json({
      counts: {
        categories: totalCategories,
        destinations: totalDestinations,
        packages: totalPackages,
        images: totalImages,
      },
      values: {
        totalPackageValue: packageValueAgg._sum.price ?? 0,
        avgPackagePrice: packageValueAgg._avg.price ?? 0,
        maxPackagePrice: packageValueAgg._max.price ?? 0,
        minPackagePrice: packageValueAgg._min.price ?? 0,
        totalDestinationValue: destinationValueAgg._sum.price ?? 0,
        avgDestinationPrice: destinationValueAgg._avg.price ?? 0,
      },
      recentDestinations,
      recentPackages,
      categoryBreakdown: packagesByCategory.map((c) => ({
        name: c.name,
        slug: c.slug,
        packages: c._count.packages,
        destinations: c._count.destinations,
      })),
      topPackages,
      monthlyData,
    });
  } catch (error) {
    console.error("[Dashboard Stats Error]", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}

// ── Helper: group records by month label ──────────────────
function buildMonthlyData(
  packages: { createdAt: Date }[],
  destinations: { createdAt: Date }[]
) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString("default", { month: "short", year: "2-digit" }));
  }

  const countByMonth = (items: { createdAt: Date }[]) => {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      const key = new Date(item.createdAt).toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      map[key] = (map[key] ?? 0) + 1;
    });
    return months.map((m) => map[m] ?? 0);
  };

  return {
    labels: months,
    packages: countByMonth(packages),
    destinations: countByMonth(destinations),
  };
}