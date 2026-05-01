import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.importedTrip.findMany({
    where: { userId },
    orderBy: [{ travelDate: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { source, externalRef, productTitle, productImage, travelDate, notes, href } = body ?? {};

  if (!productTitle || typeof productTitle !== "string" || productTitle.length < 2) {
    return NextResponse.json({ error: "productTitle required (min 2 chars)" }, { status: 400 });
  }

  const created = await prisma.importedTrip.create({
    data: {
      userId,
      source: typeof source === "string" && source ? source : "viator",
      externalRef: typeof externalRef === "string" ? externalRef.trim() || null : null,
      productTitle: productTitle.trim().slice(0, 200),
      productImage: typeof productImage === "string" ? productImage.slice(0, 500) : null,
      travelDate: travelDate ? new Date(travelDate) : null,
      notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
      href: typeof href === "string" ? href.slice(0, 500) : null,
    },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.importedTrip.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
