import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ locked: false, remainingSeconds: 0, loginAttempts: 0 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { loginAttempts: true, loginLockedUntil: true },
    });

    if (!user) {
      return NextResponse.json({ locked: false, remainingSeconds: 0, loginAttempts: 0 });
    }

    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      const remainingSeconds = Math.ceil(
        (user.loginLockedUntil.getTime() - Date.now()) / 1000
      );
      return NextResponse.json({ locked: true, remainingSeconds, loginAttempts: user.loginAttempts });
    }

    return NextResponse.json({ locked: false, remainingSeconds: 0, loginAttempts: user.loginAttempts });
  } catch {
    return NextResponse.json({ locked: false, remainingSeconds: 0, loginAttempts: 0 });
  }
}
