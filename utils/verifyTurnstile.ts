export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.CF_TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn("[Turnstile] CF_TURNSTILE_SECRET_KEY env var not set");
    return false;
  }

  if (!token) {
    console.warn("[Turnstile] Missing token");
    return false;
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }).toString(),
      }
    );

    if (!res.ok) {
      console.error(`[Turnstile] Endpoint returned HTTP ${res.status}`);
      return false;
    }

    const data = await res.json();
    console.log("[Turnstile] Result:", data);
    return data.success === true;
  } catch (err) {
    console.error("[Turnstile] Request failed:", err);
    return false;
  }
}
