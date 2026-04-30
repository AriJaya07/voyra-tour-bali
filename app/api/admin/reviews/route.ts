import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, status: 401, msg: "Unauthorized" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role;
  if (role !== "ADMIN") return { ok: false, status: 403, msg: "Forbidden" };
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";
  const validStatus = ["PENDING", "APPROVED", "REJECTED"].includes(status) ? status : "PENDING";

  const reviews = await prisma.review.findMany({
    where: { status: validStatus as "PENDING" | "APPROVED" | "REJECTED" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      booking: { select: { productTitle: true, productImage: true, travelDate: true, bookingRef: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(reviews);
}
