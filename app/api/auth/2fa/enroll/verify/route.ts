import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBackupCodes,
  verifyTotpForUser,
} from "@/lib/services/twoFactorService";

/**
 * Verify the user can read codes from their authenticator. On success, return
 * 10 plaintext backup codes (shown ONCE). 2FA is still NOT live until /finalize.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Run /enroll/start first" }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "Already enabled" }, { status: 400 });
  }

  // Skip replay guard during enrollment (no live state yet).
  const ok = await verifyTotpForUser(userId, code, { skipReplayGuard: true });
  if (!ok) {
    return NextResponse.json({ error: "Code invalid or expired. Try again." }, { status: 400 });
  }

  const backupCodes = await generateBackupCodes(userId, 10);
  return NextResponse.json({ backupCodes });
}
