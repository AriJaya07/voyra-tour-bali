import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const TIERS = [
  { name: "BRONZE", min: 0 },
  { name: "SILVER", min: 5_000_000 }, // IDR lifetime
  { name: "GOLD", min: 20_000_000 },
];

function tierFor(spend: number): string {
  let t = "BRONZE";
  for (const x of TIERS) {
    if (spend >= x.min) t = x.name;
  }
  return t;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const [account, ledger] = await Promise.all([
    prisma.loyaltyAccount.findUnique({ where: { userId } }),
    prisma.loyaltyLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  if (!account) {
    return NextResponse.json({
      pointsBalance: 0,
      tier: "BRONZE",
      lifetimeSpend: 0,
      ledger: [],
      tierThresholds: TIERS,
    });
  }

  // Recompute tier in case lifetimeSpend updated since last write
  const tier = tierFor(account.lifetimeSpend);
  if (tier !== account.tier) {
    await prisma.loyaltyAccount.update({ where: { userId }, data: { tier } });
  }

  return NextResponse.json({
    pointsBalance: account.pointsBalance,
    tier,
    lifetimeSpend: account.lifetimeSpend,
    ledger,
    tierThresholds: TIERS,
  });
}
