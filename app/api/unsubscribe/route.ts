import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/subscriptionToken";

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token) {
      return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
    }
    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
    const normalized = (email as string).toLowerCase().trim();
    const existing = await prisma.subscription.findUnique({ where: { email: normalized } });
    if (!existing) {
      return NextResponse.json({ ok: true, alreadyOff: true });
    }
    await prisma.subscription.update({
      where: { email: normalized },
      data: { status: "UNSUBSCRIBED", updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
