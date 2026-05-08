import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const [referrals, referralLedger, monthLedger] = await Promise.all([
    prisma.referral.findMany({
      where: { inviterId: userId, inviteeEmail: { not: "" } },
      select: {
        id: true,
        inviteeEmail: true,
        status: true,
        bookingsCount: true,
        totalRewarded: true,
      },
    }),
    prisma.aiCreditLedger.aggregate({
      where: { userId, reason: "GRANT_REFERRAL", delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.aiCreditLedger.aggregate({
      where: {
        userId,
        reason: "GRANT_REFERRAL",
        delta: { gt: 0 },
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _sum: { delta: true },
    }),
  ]);

  const invited = referrals.length;
  const signedUp = referrals.filter((r) => r.status === "SIGNED_UP" || r.status === "ACTIVE").length;
  const booked = referrals.filter((r) => r.status === "ACTIVE" && r.bookingsCount > 0).length;

  const signupConversion = invited > 0 ? Math.round((signedUp / invited) * 100) : 0;
  const bookConversion = signedUp > 0 ? Math.round((booked / signedUp) * 100) : 0;

  return NextResponse.json({
    funnel: {
      invited,
      signedUp,
      booked,
      signupConversion,
      bookConversion,
    },
    earnings: {
      total: referralLedger._sum.delta ?? 0,
      last30Days: monthLedger._sum.delta ?? 0,
      pendingFriends: signedUp - booked, // signed up but no booking yet
    },
  });
}
