import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/services/adminAuth";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const q = (url.searchParams.get("q") || "").trim();
  const filter = url.searchParams.get("filter") || "all"; // all | 2fa_on | 2fa_off | locked | admin
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "2fa_on") where.twoFactorEnabled = true;
  if (filter === "2fa_off") where.twoFactorEnabled = false;
  if (filter === "locked") where.loginLockedUntil = { gt: new Date() };
  if (filter === "admin") where.role = "ADMIN";

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        provider: true,
        emailVerified: true,
        twoFactorEnabled: true,
        loginLockedUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    users,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
