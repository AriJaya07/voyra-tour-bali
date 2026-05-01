import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const id = parseInt(req.nextUrl.searchParams.get("d") || "0");
  const url = req.nextUrl.searchParams.get("u") || "/";

  if (id > 0) {
    prisma.emailDelivery
      .updateMany({
        where: { id, clickedAt: null },
        data: { clickedAt: new Date() },
      })
      .catch(() => {});
  }

  const fallback = new URL("/", req.url).toString();
  let target = fallback;
  try {
    const parsed = new URL(url);
    if (/^https?:$/.test(parsed.protocol)) target = parsed.toString();
  } catch {
    // keep fallback
  }

  return NextResponse.redirect(target, 302);
}
