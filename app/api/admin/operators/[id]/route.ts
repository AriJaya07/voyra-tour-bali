import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return session?.user?.id && role === "ADMIN";
}

const STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const numId = parseInt(id);

  const body = await req.json().catch(() => ({}));
  const { status, rejectReason } = body ?? {};
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.operator.update({
    where: { id: numId },
    data: {
      status,
      rejectReason: status === "REJECTED" && rejectReason ? rejectReason.slice(0, 500) : null,
    },
  });
  return NextResponse.json(updated);
}
