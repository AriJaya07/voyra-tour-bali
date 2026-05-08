import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public — resolve a referral code → inviter first-name only.
// No PII beyond first name. Used by /r/[code] landing + register form chip.
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
  if (!code || code.length < 4) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const ref = await prisma.referral.findUnique({
    where: { code },
    select: {
      id: true,
      status: true,
      inviter: { select: { name: true } },
    },
  });

  if (!ref) return NextResponse.json({ valid: false });

  const fullName = ref.inviter?.name || "";
  const firstName = fullName.split(/\s+/)[0] || "A friend";

  return NextResponse.json({
    valid: true,
    inviterFirstName: firstName,
    welcomeCredits: 50,
  });
}
