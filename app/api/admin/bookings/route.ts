import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

type Provider = "LOCAL" | "VIATOR" | "TOURCMS";

function deriveProvider(b: {
  productCode: string;
  viatorBookingRef: string | null;
  isMockMode: boolean;
}): Provider {
  if (b.viatorBookingRef) return "VIATOR";
  if (/^[A-Z0-9]+P\d+$/i.test(b.productCode)) return "VIATOR";
  return "LOCAL";
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const provider = searchParams.get("provider") || "ALL";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

    const local: Prisma.BookingWhereInput = {};
    const tcms: Prisma.TourcmsBookingWhereInput = {};

    if (
      status &&
      ["PENDING", "PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(
        status
      )
    ) {
      const s = status as Prisma.EnumBookingStatusFilter["equals"];
      local.status = s;
      tcms.status = s as Prisma.EnumTourcmsBookingStatusFilter["equals"];
    }
    if (search.trim()) {
      const q = search.trim();
      local.OR = [
        { bookingRef: { contains: q, mode: "insensitive" } },
        { productTitle: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
      tcms.OR = [
        { bookingRef: { contains: q, mode: "insensitive" } },
        { productTitle: { contains: q, mode: "insensitive" } },
        { leadEmail: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const wantLocal = provider === "ALL" || provider === "LOCAL" || provider === "VIATOR";
    const wantTourcms = provider === "ALL" || provider === "TOURCMS";

    const [localRows, tourcmsRows] = await Promise.all([
      wantLocal
        ? prisma.booking.findMany({
            where: local,
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          })
        : Promise.resolve([]),
      wantTourcms
        ? prisma.tourcmsBooking.findMany({
            where: tcms,
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              travelers: true,
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    const merged = [
      ...localRows.map((b) => {
        const prov = deriveProvider({
          productCode: b.productCode,
          viatorBookingRef: b.viatorBookingRef,
          isMockMode: b.isMockMode,
        });
        if (provider === "LOCAL" && prov !== "LOCAL") return null;
        if (provider === "VIATOR" && prov !== "VIATOR") return null;
        return { ...b, provider: prov, _src: "booking" as const };
      }),
      ...tourcmsRows.map((b) => ({
        ...b,
        provider: "TOURCMS" as const,
        _src: "tourcms" as const,
      })),
    ].filter(Boolean) as Array<Record<string, unknown> & { createdAt: Date }>;

    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = merged.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const slice = merged.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      bookings: slice,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Admin bookings error:", msg);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
