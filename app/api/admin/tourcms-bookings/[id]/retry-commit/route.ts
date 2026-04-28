import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/utils/common/auth";
import { retryTourcmsCommit } from "@/lib/services/tourcmsPostPaymentService";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const ok = await retryTourcmsCommit(Number(id));
    return NextResponse.json({ message: ok ? "Retried" : "Failed", success: ok });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error retrying TourCMS commit:", msg);
    return NextResponse.json(
      { error: "Failed to retry commit" },
      { status: 500 }
    );
  }
}
