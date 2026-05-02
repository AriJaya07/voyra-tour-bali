import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/services/pushService";
import { sendNotificationEmail } from "@/lib/email";

export const NOTIF_CATEGORIES = ["SYSTEM", "DEAL", "TRAVEL", "ALERT", "NEWS"] as const;
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

export const NOTIF_AUDIENCES = ["ALL", "ROLE_USER", "ROLE_ADMIN", "USER_LIST"] as const;
export type NotifAudience = (typeof NOTIF_AUDIENCES)[number];

export interface NotifChannels {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

const CHUNK_SIZE = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function resolveAudience(
  audience: NotifAudience,
  audienceIds: number[] | null
): Promise<number[]> {
  if (audience === "USER_LIST") {
    if (!Array.isArray(audienceIds) || audienceIds.length === 0) return [];
    const valid = audienceIds.filter((n) => Number.isFinite(n));
    const users = await prisma.user.findMany({
      where: { id: { in: valid } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  if (audience === "ROLE_ADMIN") {
    const users = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  if (audience === "ROLE_USER") {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  // ALL
  const users = await prisma.user.findMany({ select: { id: true } });
  return users.map((u) => u.id);
}

export interface SendBroadcastResult {
  delivered: number;
  pushSent: number;
  emailSent: number;
  skipped: number;
}

/**
 * Fan-out a broadcast to its target audience.
 * - Inserts AppNotification rows for in-app inbox (idempotent via unique [broadcastId, userId]).
 * - Sends push to subscribed users (if channel enabled).
 * - Sends email (if channel enabled and not muted by category pref).
 */
export async function sendBroadcast(broadcastId: number): Promise<SendBroadcastResult> {
  const broadcast = await prisma.notificationBroadcast.findUnique({
    where: { id: broadcastId },
  });
  if (!broadcast) throw new Error(`Broadcast ${broadcastId} not found`);
  if (broadcast.status === "SENT") {
    return { delivered: 0, pushSent: 0, emailSent: 0, skipped: 0 };
  }

  await prisma.notificationBroadcast.update({
    where: { id: broadcastId },
    data: { status: "SENDING", errorMessage: null },
  });

  try {
    const audienceIds = Array.isArray(broadcast.audienceIds)
      ? (broadcast.audienceIds as number[])
      : null;
    const userIds = await resolveAudience(
      broadcast.audience as NotifAudience,
      audienceIds
    );

    const channels = broadcast.channels as unknown as NotifChannels;

    // Pull user prefs in bulk so we can respect mutes for in-app + email.
    const prefs = await prisma.notificationPref.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        marketingEmails: true,
        inAppMutedCategories: true,
      },
    });
    const prefMap = new Map(prefs.map((p) => [p.userId, p]));

    const inAppPayload = userIds
      .filter((uid) => {
        if (!channels.inApp) return false;
        const muted = (prefMap.get(uid)?.inAppMutedCategories as string[] | undefined) ?? [];
        return !muted.includes(broadcast.category);
      })
      .map((uid) => ({
        userId: uid,
        broadcastId: broadcast.id,
        title: broadcast.title,
        body: broadcast.body,
        category: broadcast.category,
        url: broadcast.url,
        iconKey: broadcast.iconKey,
      }));

    let delivered = 0;
    for (const batch of chunk(inAppPayload, CHUNK_SIZE)) {
      const res = await prisma.appNotification.createMany({
        data: batch,
        skipDuplicates: true,
      });
      delivered += res.count;
    }

    let pushSent = 0;
    if (channels.push) {
      // Best-effort, in parallel chunks.
      for (const batch of chunk(userIds, 50)) {
        const results = await Promise.allSettled(
          batch.map((uid) =>
            sendPushToUser(uid, {
              title: broadcast.title,
              body: broadcast.body.slice(0, 240),
              url: broadcast.url || "/profile/inbox",
              tag: `broadcast-${broadcast.id}`,
            })
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value && typeof r.value === "object" && "sent" in r.value) {
            pushSent += (r.value as { sent: number }).sent || 0;
          }
        }
      }
    }

    let emailSent = 0;
    if (channels.email) {
      const eligible = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          email: { not: "" },
        },
        select: { id: true, email: true, name: true },
      });
      for (const u of eligible) {
        if (!u.email) continue;
        // Marketing-style notifications gated by marketingEmails pref.
        if (broadcast.category === "DEAL") {
          const pref = prefMap.get(u.id);
          if (pref && !pref.marketingEmails) continue;
        }
        try {
          await sendNotificationEmail({
            to: u.email,
            userName: u.name || "Traveler",
            title: broadcast.title,
            body: broadcast.body,
            url: broadcast.url || undefined,
          });
          emailSent++;
        } catch (err) {
          console.error("Error sending notification email:", err);
        }
      }
    }

    await prisma.notificationBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return {
      delivered,
      pushSent,
      emailSent,
      skipped: userIds.length - delivered,
    };
  } catch (err) {
    console.error("Error sending broadcast:", err);
    await prisma.notificationBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    throw err;
  }
}

export interface DirectNotificationInput {
  userId: number;
  title: string;
  body: string;
  category: NotifCategory;
  url?: string | null;
  iconKey?: string | null;
}

/** Drop a single notification into one user's inbox (e.g., booking confirm hooks). */
export async function notifyUser(input: DirectNotificationInput) {
  return prisma.appNotification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      category: input.category,
      url: input.url ?? null,
      iconKey: input.iconKey ?? null,
    },
  });
}
