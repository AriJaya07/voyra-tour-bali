import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "voyra_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 32) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

// Used by RegisterForm to peek what code is stored in cookie (HttpOnly cookie
// can't be read by JS, so we expose it via this endpoint — no PII).
export async function GET(req: NextRequest) {
  const code = req.cookies.get(COOKIE_NAME)?.value || null;
  return NextResponse.json({ code });
}
