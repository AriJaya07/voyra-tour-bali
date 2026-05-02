import nodemailer from "nodemailer"
import { SITE_NAME } from "@/lib/config"

if (!process.env.NEXTAUTH_URL) {
  throw new Error('Missing required environment variable: NEXTAUTH_URL')
}
const SITE_URL = process.env.NEXTAUTH_URL

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = `${SITE_NAME} <${process.env.SMTP_FROM}>`

// ── Generic send helper ────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  await transporter.sendMail({ from: FROM, to, subject, html });
}

// ── Email Verification ──────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string, callbackUrl?: string) {
  const params = new URLSearchParams({ token })
  if (callbackUrl) params.set("callbackUrl", callbackUrl)
  const verifyUrl = `${SITE_URL}/api/auth/verify?${params.toString()}`

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Verify your email — ${SITE_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0071CE; margin-bottom: 16px;">Welcome to ${SITE_NAME}!</h2>
        <p style="color: #333; line-height: 1.6;">
          Thank you for registering. Please verify your email address to start booking tours in Bali.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0071CE; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 13px;">
          Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  })
}

// ── Password Reset ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${SITE_URL}/reset-password?token=${token}`

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reset your password — ${SITE_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0071CE; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="color: #333; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0071CE; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}

// ── T-1 Day Trip Reminder ───────────────────────────────────────────────

export async function sendTripReminder(params: {
  email: string
  userName: string
  bookingRef: string
  productTitle: string
  travelDate: string
  travelTime?: string | null
  meetingPoint?: string | null
  pax: number
  ticketToken: string | null
}) {
  const ticketUrl = params.ticketToken ? `${SITE_URL}/ticket/${params.ticketToken}` : null
  const supportWa = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890"
  const waUrl = `https://wa.me/${supportWa}?text=${encodeURIComponent(
    `Hi, I have a question about my trip tomorrow (booking ${params.bookingRef})`
  )}`

  await transporter.sendMail({
    from: FROM,
    to: params.email,
    subject: `Tomorrow: ${params.productTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align: center; padding: 24px 16px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; margin-bottom: 24px;">
          <div style="font-size: 40px; line-height: 1;">⏰</div>
          <h2 style="color: white; margin: 12px 0 4px; font-size: 24px;">Trip Reminder · Tomorrow</h2>
          <p style="color: #ffe4b8; margin: 0; font-size: 14px;">Final prep before your Bali adventure</p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${params.userName || "Traveler"}</strong>, just a quick reminder about your trip tomorrow.
        </p>

        <div style="background: #f7f9fc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Trip Snapshot</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #666;">Tour</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${params.productTitle}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Date</td><td style="padding: 6px 0; text-align: right;">${params.travelDate}</td></tr>
            ${params.travelTime ? `<tr><td style="padding: 6px 0; color: #666;">Pickup time</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${params.travelTime}</td></tr>` : ""}
            ${params.meetingPoint ? `<tr><td style="padding: 6px 0; color: #666;">Meeting point</td><td style="padding: 6px 0; text-align: right;">${params.meetingPoint}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #666;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.pax} person(s)</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Booking ref</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${params.bookingRef}</td></tr>
          </table>
        </div>

        ${
          ticketUrl
            ? `<a href="${ticketUrl}" style="display: block; text-align: center; padding: 14px; background: #0071CE; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; margin-bottom: 16px;">View Ticket & QR Code</a>`
            : ""
        }

        <div style="background: #fff8eb; border: 1px solid #fde6c2; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #92400e; font-size: 14px;">Quick checklist</p>
          <ul style="margin: 0; padding-left: 18px; color: #78350f; font-size: 13px; line-height: 1.7;">
            <li>Save the QR code or screenshot your ticket</li>
            <li>Charge your phone overnight</li>
            <li>Bring sunscreen, water, hat, and comfortable shoes</li>
            <li>Arrive at the meeting point 15 minutes early</li>
            <li>Check the weather and dress accordingly</li>
          </ul>
        </div>

        <div style="text-align: center; padding: 14px; background: #f0fdf4; border-radius: 12px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #14532d;">Need to change something?</p>
          <a href="${waUrl}" style="display: inline-block; padding: 10px 20px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Chat on WhatsApp</a>
        </div>

        <p style="color: #888; font-size: 13px; line-height: 1.5; text-align: center;">
          We hope you have an unforgettable experience. See you tomorrow!
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center; line-height: 1.6;">
          ${SITE_NAME} — Your trusted Bali travel companion<br>
          <a href="${SITE_URL}/cancellation-policy" style="color: #aaa;">Cancellation Policy</a> &middot;
          <a href="${SITE_URL}/contact" style="color: #aaa;">Support</a>
        </p>
      </div>
    `,
  })
}

// ── Booking Confirmation + Ticket ───────────────────────────────────────

export async function sendBookingConfirmation(params: {
  email: string
  userName: string
  bookingRef: string
  productTitle: string
  travelDate: string
  pax: number
  totalPrice: string
  ticketToken: string
  meetingPoint?: string | null
  travelTime?: string | null
}) {
  const ticketUrl = `${SITE_URL}/ticket/${params.ticketToken}`
  const supportWa = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890"
  const waUrl = `https://wa.me/${supportWa}?text=${encodeURIComponent(
    `Hi, I have a question about booking ${params.bookingRef}`
  )}`

  await transporter.sendMail({
    from: FROM,
    to: params.email,
    subject: `Booking Confirmed — ${params.productTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">

        <div style="text-align: center; padding: 24px 16px; background: linear-gradient(135deg, #0071CE 0%, #005ba6 100%); border-radius: 16px; margin-bottom: 24px;">
          <div style="font-size: 40px; line-height: 1;">🎉</div>
          <h2 style="color: white; margin: 12px 0 4px; font-size: 24px;">Booking Confirmed</h2>
          <p style="color: #cce4f7; margin: 0; font-size: 14px;">Get ready for an unforgettable Bali experience!</p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${params.userName || "Traveler"}</strong>, thanks for booking with us. Your trip is locked in.
        </p>

        <div style="background: #f7f9fc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Trip Details</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #666;">Booking Ref</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${params.bookingRef}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Tour</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${params.productTitle}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Date</td><td style="padding: 6px 0; text-align: right;">${params.travelDate}</td></tr>
            ${params.travelTime ? `<tr><td style="padding: 6px 0; color: #666;">Time</td><td style="padding: 6px 0; text-align: right;">${params.travelTime}</td></tr>` : ""}
            ${params.meetingPoint ? `<tr><td style="padding: 6px 0; color: #666;">Meeting Point</td><td style="padding: 6px 0; text-align: right;">${params.meetingPoint}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #666;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.pax} person(s)</td></tr>
            <tr><td style="padding: 12px 0 0; color: #666; border-top: 1px solid #e5e7eb;">Total Paid</td><td style="padding: 12px 0 0; font-weight: bold; font-size: 18px; text-align: right; border-top: 1px solid #e5e7eb;">${params.totalPrice}</td></tr>
          </table>
        </div>

        <a href="${ticketUrl}" style="display: block; text-align: center; padding: 16px; background: #0071CE; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin-bottom: 12px;">
          View Your Ticket & QR Code
        </a>

        <a href="${SITE_URL}/profile#my-bookings" style="display: block; text-align: center; padding: 14px; background: #eef5fc; color: #0071CE; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; margin-bottom: 24px;">
          Manage in My Profile
        </a>

        <div style="background: #fff8eb; border: 1px solid #fde6c2; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #92400e; font-size: 14px;">Before your trip</p>
          <ul style="margin: 0; padding-left: 18px; color: #78350f; font-size: 13px; line-height: 1.7;">
            <li>Save the QR code or screenshot your ticket</li>
            <li>Arrive at the meeting point 15 minutes early</li>
            <li>Bring sunscreen, water, and comfortable shoes</li>
            <li>Check the weather the day before — Bali can be tropical</li>
          </ul>
        </div>

        <div style="text-align: center; padding: 16px; background: #f0fdf4; border-radius: 12px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #14532d;">Questions? We&apos;re on WhatsApp</p>
          <a href="${waUrl}" style="display: inline-block; padding: 10px 20px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Chat with Us
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center; line-height: 1.6;">
          ${SITE_NAME} — Your trusted Bali travel companion<br>
          <a href="${SITE_URL}/cancellation-policy" style="color: #aaa;">Cancellation Policy</a> &middot;
          <a href="${SITE_URL}/contact" style="color: #aaa;">Support</a>
        </p>
      </div>
    `,
  })
}

// ── Generic notification (used by NotificationBroadcast) ───────────────

export async function sendNotificationEmail(params: {
  to: string;
  userName: string;
  title: string;
  body: string;
  url?: string;
}) {
  const ctaHref = params.url
    ? params.url.startsWith("http")
      ? params.url
      : `${SITE_URL}${params.url}`
    : null;
  const cta = ctaHref
    ? `<a href="${ctaHref}" style="display:inline-block; padding:12px 24px; background:#0071CE; color:#fff; text-decoration:none; font-weight:bold; border-radius:8px; margin-top:16px;">View details</a>`
    : "";

  const safeBody = params.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: params.title,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1f2937;">
        <div style="background:linear-gradient(135deg,#0071CE,#005ba6); border-radius:16px; padding:24px; color:#fff; margin-bottom:24px;">
          <h1 style="margin:0; font-size:22px; font-weight:800;">${params.title}</h1>
        </div>
        <p style="font-size:14px; color:#4b5563; margin-bottom:8px;">Hi ${params.userName},</p>
        <div style="font-size:15px; line-height:1.6; color:#1f2937;">${safeBody}</div>
        ${cta}
        <p style="font-size:11px; color:#9ca3af; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          You're receiving this because you have notifications enabled.
          <a href="${SITE_URL}/profile/notifications" style="color:#0071CE;">Manage preferences</a>
        </p>
      </div>
    `,
  });
}
