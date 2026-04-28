import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") || undefined;
    const q = sp.get("q") || undefined;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize") || 25)));

    const where: {
      status?: "PENDING" | "PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
      OR?: Array<Record<string, { contains: string; mode: "insensitive" }>>;
    } = {};
    if (status && ["PENDING", "PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)) {
      where.status = status as
        | "PENDING"
        | "PAYMENT"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED";
    }
    if (q) {
      where.OR = [
        { bookingRef: { contains: q, mode: "insensitive" } },
        { productTitle: { contains: q, mode: "insensitive" } },
        { leadEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tourcmsBooking.findMany({
        where,
        include: {
          travelers: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tourcmsBooking.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching admin TourCMS bookings:", msg);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
