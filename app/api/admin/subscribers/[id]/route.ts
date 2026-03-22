import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

// ─────────────────────────────────────────
// PATCH /api/admin/subscribers/[id]
// Body: { status: "ACTIVE" | "UNSUBSCRIBED" }
// ─────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["ACTIVE", "UNSUBSCRIBED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be ACTIVE or UNSUBSCRIBED." },
        { status: 400 }
      );
    }

    const updated = await (prisma as any).subscription.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }
    console.error("Admin Update Error:", error);
    return NextResponse.json({ error: "Failed to update subscriber." }, { status: 500 });
  }
}

// ─────────────────────────────────────────
// DELETE /api/admin/subscribers/[id]
// ─────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await (prisma as any).subscription.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: "Subscriber deleted." });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }
    console.error("Admin Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete subscriber." }, { status: 500 });
  }
}

