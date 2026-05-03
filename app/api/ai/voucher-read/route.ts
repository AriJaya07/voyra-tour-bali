import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelReservation,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";

/**
 * AI Voucher Reader (Vision)
 *
 * Credit-gated only (5 credits). Vision endpoint additionally requires
 * ENABLE_AI_VISION=true and ANTHROPIC_API_KEY at the deployment level.
 * Accepts an image upload (booking voucher screenshot/PDF page) and returns
 * structured booking metadata. Optionally writes an ImportedTrip row +
 * CalendarEvent so the user's profile picks it up.
 *
 * Vision is not provided by Groq — opt-in via env:
 *   ENABLE_AI_VISION=true
 *   ANTHROPIC_API_KEY=<sk-ant-…>
 *   AI_VISION_MODEL=claude-haiku-4-5-20251001  (default)
 *
 * Without ANTHROPIC_API_KEY the endpoint returns 503.
 *
 * Request: multipart/form-data with field "file" (image/jpeg, image/png, image/webp).
 * Optional fields: addToTrips=true, addToCalendar=true.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB safety cap
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ExtractedVoucher {
  productTitle: string | null;
  productCode: string | null;
  travelDate: string | null;
  travelTime: string | null;
  meetingPoint: string | null;
  pax: number | null;
  leadName: string | null;
  bookingRef: string | null;
  vendor: string | null;
  totalPrice: string | null;
  notes: string | null;
}

const EXTRACTION_PROMPT = `Extract booking voucher data from this image. Return ONLY a JSON object matching:
{
  "productTitle": string | null,
  "productCode": string | null,
  "travelDate": "YYYY-MM-DD" | null,
  "travelTime": "HH:MM" (24h) | null,
  "meetingPoint": string | null,
  "pax": number | null,
  "leadName": string | null,
  "bookingRef": string | null,
  "vendor": string | null,
  "totalPrice": string | null,
  "notes": string | null
}

Rules:
- Use null when a field is absent. Do not guess.
- Normalise dates to ISO (YYYY-MM-DD).
- Strip currency symbols from totalPrice and keep raw string.
- Output JSON only, no markdown.`;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  const ENDPOINT = "voucher_read" as const;

  try {
    if ((process.env.ENABLE_AI_VISION ?? "").toLowerCase() !== "true" || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "Voucher reader is not enabled on this deployment.",
          reason: "FEATURE_DISABLED",
        },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Multipart form expected" }, { status: 400 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File missing" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only JPG / PNG / WEBP supported" }, { status: 400 });
    }

    const addToTrips = String(form.get("addToTrips") ?? "false") === "true";
    const addToCalendar = String(form.get("addToCalendar") ?? "false") === "true";

    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.voucher_read);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/plans" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;
    billedUserId = userId;

    // Convert upload to base64 for Anthropic Vision
    const arrayBuf = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");

    const model = process.env.AI_VISION_MODEL ?? "claude-haiku-4-5-20251001";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: file.type, data: base64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => "");
      throw new Error(`Anthropic API ${anthropicRes.status}: ${errBody.slice(0, 200)}`);
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const rawText = anthropicJson.content?.find((b) => b.type === "text")?.text ?? "{}";
    let extracted: ExtractedVoucher;
    try {
      // Strip any code fences the model might emit
      const cleaned = rawText.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
      extracted = JSON.parse(cleaned) as ExtractedVoucher;
    } catch {
      throw new Error("Vision returned non-JSON response");
    }

    // Optional side-effects: write ImportedTrip + CalendarEvent
    let createdImportedTripId: number | null = null;
    let createdCalendarEventId: number | null = null;

    if (addToTrips && extracted.productTitle) {
      const externalRef = extracted.bookingRef
        ? `voucher-${extracted.bookingRef}`
        : `voucher-${Date.now()}-${userId}`;
      const exists = await prisma.importedTrip.findFirst({
        where: { userId, externalRef },
        select: { id: true },
      });
      if (!exists) {
        const trip = await prisma.importedTrip.create({
          data: {
            userId,
            source: extracted.vendor ?? "external",
            externalRef,
            productTitle: extracted.productTitle,
            travelDate: extracted.travelDate ? new Date(extracted.travelDate) : null,
            notes: extracted.notes ?? null,
          },
        });
        createdImportedTripId = trip.id;
      }
    }

    if (addToCalendar && extracted.productTitle && extracted.travelDate) {
      const cal = await prisma.calendarEvent.create({
        data: {
          userId,
          title: extracted.productTitle,
          notes: extracted.notes ?? null,
          date: new Date(extracted.travelDate),
          startTime: extracted.travelTime ?? null,
          location: extracted.meetingPoint ?? null,
          color: "blue",
        },
      });
      createdCalendarEventId = cal.id;
    }

    const tokensIn = anthropicJson.usage?.input_tokens ?? null;
    const tokensOut = anthropicJson.usage?.output_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = AI_ENDPOINT_COST.voucher_read;

    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    if (billedUserId !== null) {
      await prisma.aiUsage
        .create({
          data: {
            userId: billedUserId,
            endpoint: ENDPOINT,
            creditsCost: actualCost,
            tokensIn,
            tokensOut,
            durationMs,
            model,
            status: "OK",
            meta: {
              addedToTrips: !!createdImportedTripId,
              addedToCalendar: !!createdCalendarEventId,
            },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      extracted,
      createdImportedTripId,
      createdCalendarEventId,
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/voucher-read]", error);
    return NextResponse.json({ error: "Voucher reader failed" }, { status: 500 });
  }
}
