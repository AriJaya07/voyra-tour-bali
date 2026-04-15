import axios from "axios";

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.CF_TURNSTILE_SECRET_KEY;
  if (!secret || !token) {
    console.warn("[Turnstile] Missing secret or token", { hasSecret: !!secret, hasToken: !!token });
    return false;
  }

  try {
    const { data } = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v1/siteverify",
      { secret, response: token }
    );

    console.log("[Turnstile] Verification result:", data);
    return data.success === true;
  } catch (err) {
    console.error("[Turnstile] Error:", err);
    return false;
  }
}
