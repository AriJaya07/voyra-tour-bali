import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/services/adminAuth";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const eventFilter = url.searchParams.get("event") || null;

  const where = {
    targetId: id,
    ...(eventFilter ? { event: eventFilter } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        event: true,
        ipHash: true,
        meta: true,
        createdAt: true,
        actor: { select: { id: true, email: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    entries,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
