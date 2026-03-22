import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

// Helper: enforce ADMIN-only access
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

// ─────────────────────────────────────────
// GET /api/admin/subscribers
// Query params: ?page=1&limit=20&search=&status=
// ─────────────────────────────────────────
export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || ""; // ACTIVE | UNSUBSCRIBED | ""

  const where: any = {};
  if (search) {
    where.email = { contains: search.toLowerCase(), mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }

  const [total, subscribers] = await Promise.all([
    (prisma as any).subscription.count({ where }),
    (prisma as any).subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: subscribers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ─────────────────────────────────────────
// POST /api/admin/subscribers
// Body: { email, source? }
// ─────────────────────────────────────────
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, source = "ADMIN" } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await (prisma as any).subscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    const subscriber = await (prisma as any).subscription.create({
      data: { email: normalizedEmail, source, status: "ACTIVE" },
    });

    return NextResponse.json({ success: true, data: subscriber }, { status: 201 });
  } catch (error) {
    console.error("Admin Create Subscriber Error:", error);
    return NextResponse.json({ error: "Failed to create subscriber." }, { status: 500 });
  }
}
