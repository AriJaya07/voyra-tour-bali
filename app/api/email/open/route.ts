import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const id = parseInt(req.nextUrl.searchParams.get("d") || "0");
  if (id > 0) {
    prisma.emailDelivery
      .updateMany({
        where: { id, openedAt: null },
        data: { openedAt: new Date() },
      })
      .catch(() => {});
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Length": String(PIXEL.length),
    },
  });
}
