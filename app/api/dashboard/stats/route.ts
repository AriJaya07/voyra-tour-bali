import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      statusCounts,
      revenueTotal,
      revenueThisMonth,
      totalUsers,
      newUsersThisMonth,
      bookingsThisMonth,
      recentBookings,
      topProducts,
      monthlyBookings,
      monthlyRevenue,
    ] = await Promise.all([
      // Booking counts per status
      prisma.booking.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // All-time revenue (CONFIRMED + COMPLETED)
      prisma.booking.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalPrice: true },
      }),

      // This-month revenue
      prisma.booking.aggregate({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalPrice: true },
      }),

      // Total users
      prisma.user.count(),

      // New users this month
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),

      // Bookings created this month
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),

      // Recent 5 bookings
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookingRef: true,
          productTitle: true,
          productImage: true,
          totalPrice: true,
          currency: true,
          travelDate: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),

      // Top 5 products by booking count
      prisma.booking.groupBy({
        by: ["productCode", "productTitle"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Bookings per month for last 6 months (count)
      prisma.booking.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // Revenue per month for last 6 months (CONFIRMED + COMPLETED only)
      prisma.booking.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        select: { createdAt: true, totalPrice: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build status map
    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s._count.id;
    }
    const totalBookings = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Build monthly chart data
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(
        d.toLocaleString("default", { month: "short", year: "2-digit" })
      );
    }

    const getMonthKey = (date: Date) =>
      new Date(date).toLocaleString("default", { month: "short", year: "2-digit" });

    const bookingsByMonth = monthLabels.map((label) => {
      return monthlyBookings.filter((b) => getMonthKey(b.createdAt) === label).length;
    });

    const revenueByMonth = monthLabels.map((label) => {
      return monthlyRevenue
        .filter((b) => getMonthKey(b.createdAt) === label)
        .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
    });

    return NextResponse.json({
      bookings: {
        total: totalBookings,
        pending: (statusMap["PENDING"] ?? 0) + (statusMap["PAYMENT"] ?? 0),
        confirmed: statusMap["CONFIRMED"] ?? 0,
        completed: statusMap["COMPLETED"] ?? 0,
        cancelled: statusMap["CANCELLED"] ?? 0,
        thisMonth: bookingsThisMonth,
      },
      revenue: {
        total: revenueTotal._sum.totalPrice ?? 0,
        thisMonth: revenueThisMonth._sum.totalPrice ?? 0,
      },
      users: {
        total: totalUsers,
        thisMonth: newUsersThisMonth,
      },
      recentBookings,
      topProducts: topProducts.map((p) => ({
        productCode: p.productCode,
        productTitle: p.productTitle,
        count: p._count.id,
      })),
      chart: {
        labels: monthLabels,
        bookings: bookingsByMonth,
        revenue: revenueByMonth,
      },
    });
  } catch (error) {
    console.error("[dashboard/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
