import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const SITE_URL = process.env.NEXTAUTH_URL || "";

type EmailType =
  | "WELCOME"
  | "VERIFY"
  | "PASSWORD_RESET"
  | "BOOKING_CONFIRMATION"
  | "TRIP_REMINDER"
  | "ABANDONED_WISHLIST"
  | "TRIP_ANNIVERSARY"
  | "NEWSLETTER"
  | "PRE_TRIP"
  | "GENERIC";

interface SendOpts {
  userId: number;
  email: string;
  type: EmailType;
  subject: string;
  html: string;
  campaignId?: string;
  meta?: Record<string, unknown>;
  trackOpens?: boolean;
  trackLinks?: boolean;
}

const isUnsubscribed = async (userId: number, type: EmailType) => {
  const pref = await prisma.notificationPref.findUnique({ where: { userId } });
  if (!pref) return false;
  if (type === "PASSWORD_RESET" || type === "VERIFY" || type === "BOOKING_CONFIRMATION") return false;
  if (type === "TRIP_REMINDER") return pref.tripReminders === false;
  if (type === "ABANDONED_WISHLIST" || type === "NEWSLETTER") return pref.marketingEmails === false;
  return false;
};

const injectTracking = (html: string, deliveryId: number, trackLinks: boolean) => {
  let out = html;
  if (trackLinks && SITE_URL) {
    out = out.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (_m, url) =>
        `href="${SITE_URL}/api/email/click?d=${deliveryId}&u=${encodeURIComponent(url)}"`
    );
  }
  if (SITE_URL) {
    const pixel = `<img src="${SITE_URL}/api/email/open?d=${deliveryId}" width="1" height="1" style="display:none" alt="" />`;
    if (out.includes("</body>")) {
      out = out.replace("</body>", `${pixel}</body>`);
    } else {
      out = out + pixel;
    }
  }
  return out;
};

export async function sendTrackedEmail(opts: SendOpts) {
  const { userId, email, type, subject, html, campaignId, meta, trackOpens = true, trackLinks = true } = opts;

  if (await isUnsubscribed(userId, type)) {
    return { skipped: true as const, reason: "UNSUBSCRIBED" };
  }

  const delivery = await prisma.emailDelivery.create({
    data: {
      userId,
      type,
      campaignId,
      meta: (meta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  const finalHtml = trackOpens ? injectTracking(html, delivery.id, trackLinks) : html;

  try {
    await sendEmail({ to: email, subject, html: finalHtml });
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { sentAt: new Date() },
    });
    return { skipped: false as const, deliveryId: delivery.id };
  } catch (err) {
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { meta: { error: String((err as Error).message || err) } as Prisma.InputJsonValue },
    });
    throw err;
  }
}

export async function listRecentDeliveries(userId: number, limit = 20) {
  return prisma.emailDelivery.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}
