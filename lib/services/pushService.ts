import { prisma } from "@/lib/prisma";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@voyra.id";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;
let webpushReady = false;

async function getWebPush() {
  if (webpushReady) return webpush;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (await import("web-push" as string).catch(() => null)) as any;
    if (!mod) return null;
    const pkg = mod.default || mod;
    pkg.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    webpush = pkg;
    webpushReady = true;
    return webpush;
  } catch {
    return null;
  }
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  const push = await getWebPush();
  if (!push) return { sent: 0, skipped: "no-vapid-or-lib" };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  const stale: number[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await push.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
      }
    })
  );

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }

  return { sent, pruned: stale.length };
}

export function getPublicVapidKey() {
  return VAPID_PUBLIC || null;
}
