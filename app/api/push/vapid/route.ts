import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/services/pushService";

export async function GET() {
  return NextResponse.json({ publicKey: getPublicVapidKey() });
}
