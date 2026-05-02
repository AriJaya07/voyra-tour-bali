import crypto from "crypto";

function getSecret(): string {
  const s = process.env.SUBSCRIPTION_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Missing SUBSCRIPTION_TOKEN_SECRET / NEXTAUTH_SECRET");
  return s;
}

export function buildUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  return crypto.createHmac("sha256", getSecret()).update(`unsub:${normalized}`).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = buildUnsubscribeToken(email);
  // Constant-time compare
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildUnsubscribeUrl(siteUrl: string, email: string): string {
  const token = buildUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${siteUrl}/unsubscribe?${params.toString()}`;
}
