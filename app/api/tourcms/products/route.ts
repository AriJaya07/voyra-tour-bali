import { NextRequest, NextResponse } from "next/server";

import { listProducts } from "@/lib/services/tourcmsService";
import { TourcmsApiError } from "@/types/tourcms";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q") || undefined;
    const categoryId = sp.get("categoryId") ? Number(sp.get("categoryId")) : undefined;
    const channelId = sp.get("channelId") ? Number(sp.get("channelId")) : undefined;
    const page = sp.get("page") ? Math.max(1, Number(sp.get("page"))) : 1;
    const pageSize = sp.get("pageSize")
      ? Math.max(1, Math.min(50, Number(sp.get("pageSize"))))
      : 24;
    const noCache = sp.get("nocache") === "1";

    const result = await listProducts({ q, categoryId, channelId, page, pageSize, noCache });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching TourCMS products:", msg);
    if (error instanceof TourcmsApiError) {
      return NextResponse.json(
        { error: "Upstream unavailable", detail: msg },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch products", detail: msg },
      { status: 500 }
    );
  }
}
