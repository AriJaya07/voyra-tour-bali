import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const VALID_CHANNELS = new Set([
  "share_link",
  "email",
  "code_input",
  "whatsapp",
  "x",
  "facebook",
  "native_share",
  "copy",
]);

// Records a share-event for analytics + bumps `lastSharedAt` on the personal-code row.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const channel = String(body?.channel || "").toLowerCase();
  const code = String(body?.code || "").trim().toUpperCase();

  if (!VALID_CHANNELS.has(channel)) {
    return NextResponse.json({ error: "invalid channel" }, { status: 400 });
  }

  const where = code
    ? { code }
    : { inviterId: userId, inviteeEmail: "" };

  await prisma.referral.updateMany({
    where,
    data: { lastSharedAt: new Date(), attributionSource: channel },
  });

  return NextResponse.json({ ok: true });
}
