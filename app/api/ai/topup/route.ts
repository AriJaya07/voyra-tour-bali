import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { createTopupPayment } from "@/lib/services/aiPaymentService";
import { AI_PACKS, type AiPackKey } from "@/lib/config/aiPlans";

/**
 * POST /api/ai/topup
 * Body: { pack: "STARTER" | "STANDARD" | "BIG" | "MEGA" }
 *
 * Issues a Midtrans Snap token for an AI credit top-up. Credits land on the
 * user's wallet only after the webhook confirms payment.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const packKey = typeof body?.pack === "string" ? (body.pack as AiPackKey) : null;
    if (!packKey || !(packKey in AI_PACKS)) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const siteUrl = process.env.NEXTAUTH_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXTAUTH_URL is not set" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });
    const fullName = (user?.name ?? "").trim();
    const [firstName, ...rest] = fullName.length > 0 ? fullName.split(/\s+/) : ["Guest"];

    const result = await createTopupPayment({
      userId,
      pack: packKey,
      contact: {
        firstName: firstName || "Guest",
        lastName: rest.join(" "),
        email: user?.email ?? session.user.email ?? "",
        phone: user?.phone ?? "",
      },
      siteUrl,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Top-up failed" }, { status: 502 });
    }

    return NextResponse.json({
      paymentId: result.paymentId,
      snapToken: result.snapToken,
      redirectUrl: result.redirectUrl,
      amountIdr: result.amountIdr,
      pack: packKey,
    });
  } catch (error) {
    console.error("Error creating AI top-up:", error);
    return NextResponse.json({ error: "Failed to create top-up" }, { status: 500 });
  }
}
