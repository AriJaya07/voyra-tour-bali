import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { verifyChallengeCode } from "@/lib/services/twoFactorService";
import { recordAudit } from "@/lib/services/auditLogService";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const challengeId = Number(body?.challengeId);
  const code = String(body?.code || "");
  const method = String(body?.method || "TOTP") as "TOTP" | "BACKUP";

  if (!challengeId || !code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (method === "BACKUP") {
    await prisma.twoFactorChallenge
      .update({ where: { id: challengeId }, data: { method: "BACKUP" } })
      .catch(() => {});
  }

  const result = await verifyChallengeCode({
    challengeId,
    code,
    expectedUserId: userId,
    expectedPurpose: "STEP_UP",
  });

  if (!result.ok) {
    if (result.reason === "INVALID") {
      void recordAudit({ event: "2FA_LOGIN_FAIL", targetId: userId, req, meta: { purpose: "STEP_UP" } });
    }
    const status = result.reason === "EXPIRED" ? 410 : result.reason === "EXHAUSTED" ? 429 : 401;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, mfaToken: result.mfaToken });
}
