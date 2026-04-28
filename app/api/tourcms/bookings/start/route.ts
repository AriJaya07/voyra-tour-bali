import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { startTourcmsBooking } from "@/lib/services/tourcmsBookingService";
import { TourcmsApiError, type TourcmsPaxMixEntry } from "@/types/tourcms";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

interface StartBody {
  productCode?: string;
  componentKey?: string;
  productOptionCode?: string;
  productTitle?: string;
  productImage?: string;
  travelDate?: string;
  travelTime?: string;
  paxMix?: TourcmsPaxMixEntry[];
  totalPriceSource?: number;
  currencySource?: string;
  travelers?: { firstName: string; lastName: string; ageBand: string }[];
  leadFirstName?: string;
  leadLastName?: string;
  leadEmail?: string;
  leadPhone?: string;
  meetingPoint?: string;
  idempotencyKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as { id?: number | string }).id);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recentCount = await prisma.tourcmsBooking.count({
      where: {
        userId,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many booking attempts, please wait a minute" },
        { status: 429 }
      );
    }

    const body = (await req.json()) as StartBody;

    const required: (keyof StartBody)[] = [
      "productCode",
      "componentKey",
      "productTitle",
      "travelDate",
      "paxMix",
      "totalPriceSource",
      "currencySource",
      "leadFirstName",
      "leadLastName",
      "leadEmail",
      "leadPhone",
    ];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        return NextResponse.json({ error: `${f} is required` }, { status: 400 });
      }
    }
    if (!Array.isArray(body.paxMix) || body.paxMix.length === 0) {
      return NextResponse.json({ error: "paxMix required" }, { status: 400 });
    }
    if (Number(body.totalPriceSource) <= 0) {
      return NextResponse.json({ error: "totalPriceSource must be > 0" }, { status: 400 });
    }
    const travelDate = new Date(body.travelDate as string);
    if (Number.isNaN(travelDate.getTime())) {
      return NextResponse.json({ error: "travelDate invalid" }, { status: 400 });
    }

    const result = await startTourcmsBooking({
      userId,
      productCode: body.productCode as string,
      componentKey: body.componentKey as string,
      productOptionCode: body.productOptionCode,
      productTitle: body.productTitle as string,
      productImage: body.productImage,
      travelDate: body.travelDate as string,
      travelTime: body.travelTime,
      paxMix: body.paxMix,
      totalPriceSource: Number(body.totalPriceSource),
      currencySource: body.currencySource as string,
      travelers: Array.isArray(body.travelers) ? body.travelers : [],
      leadFirstName: body.leadFirstName as string,
      leadLastName: body.leadLastName as string,
      leadEmail: body.leadEmail as string,
      leadPhone: body.leadPhone as string,
      meetingPoint: body.meetingPoint,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error starting TourCMS booking:", msg);
    if (error instanceof TourcmsApiError) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Failed to start booking" },
      { status: 500 }
    );
  }
}
