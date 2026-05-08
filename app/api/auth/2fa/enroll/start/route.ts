import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOtpauthUrl,
  encryptSecret,
  generateTotpSecret,
} from "@/lib/services/twoFactorService";

/**
 * Begin 2FA enrollment. Verifies password (re-auth gate), generates a fresh
 * TOTP secret, stores it encrypted but does NOT flip enabled. Caller renders
 * the QR + then calls /verify with a 6-digit code.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true, twoFactorEnabled: true, provider: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.provider === "google" && !user.password) {
    return NextResponse.json(
      { error: "Google-authenticated accounts use Google's 2FA. Manage it in your Google account." },
      { status: 400 }
    );
  }
  if (!user.password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA already enabled" }, { status: 400 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpauthUrl(secret, user.email);

  // Store encrypted secret on User but keep enabled=false until /verify completes.
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encryptSecret(secret), twoFactorMethod: "TOTP" },
  });

  return NextResponse.json({
    secret, // base32 — for manual entry
    otpauthUrl, // for QR rendering
  });
}
