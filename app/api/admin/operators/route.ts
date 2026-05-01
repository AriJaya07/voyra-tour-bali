import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return session?.user?.id && role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: "desc" },
    include: { ownerUser: { select: { email: true, name: true } } },
  });
  return NextResponse.json(operators);
}
