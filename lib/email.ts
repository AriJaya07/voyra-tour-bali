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

// ── Referral Invite ────────────────────────────────────────────────────

export async function sendReferralInviteEmail(params: {
  to: string;
  inviterName: string;
  code: string;
}) {
  const link = `${SITE_URL}/r/${params.code}`;
  const inviter = params.inviterName?.trim() || "A friend";
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `${inviter} invited you to ${SITE_NAME} — 50 free credits inside`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align:center; padding:28px 16px; background:linear-gradient(135deg,#0071CE,#005ba6); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px; line-height:1;">🌴</div>
          <h2 style="color:white; margin:12px 0 4px; font-size:24px;">${inviter} invited you</h2>
          <p style="color:#cce4f7; margin:0; font-size:14px;">Get 50 free AI trip-credits when you join</p>
        </div>
        <p style="color:#333; line-height:1.6;">
          ${inviter} thinks you'd like ${SITE_NAME} — Bali tours, planned smarter. Sign up with their invite and you'll start with <strong>50 AI trip-credits</strong> in your wallet.
        </p>
        <div style="background:#f7f9fc; border-radius:12px; padding:20px; margin:20px 0; text-align:center;">
          <p style="margin:0 0 8px; font-size:12px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Your invite code</p>
          <p style="margin:0; font-family:monospace; font-size:24px; font-weight:900; color:#0071CE;">${params.code}</p>
        </div>
        <a href="${link}" style="display:block; text-align:center; padding:16px; background:#0071CE; color:white; text-decoration:none; border-radius:12px; font-weight:bold; font-size:16px; margin-bottom:12px;">
          Claim your 50 credits
        </a>
        <p style="color:#888; font-size:13px; text-align:center;">Or copy this link: <a href="${link}" style="color:#0071CE;">${link}</a></p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
        <p style="color:#aaa; font-size:12px; text-align:center; line-height:1.6;">
          ${SITE_NAME} — Real travel only. Credits valid 365 days.<br>
          You received this because ${inviter} entered your email. <a href="${SITE_URL}/unsubscribe" style="color:#aaa;">Unsubscribe</a>.
        </p>
      </div>
    `,
  });
}

// ── Referral: friend signed up (notify inviter) ────────────────────────

export async function sendReferralSignupInviterEmail(params: {
  to: string;
  inviterName: string;
  inviteeName: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `${params.inviteeName} just joined ${SITE_NAME}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#10b981,#059669); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px; line-height:1;">🎉</div>
          <h2 style="color:white; margin:12px 0 4px; font-size:24px;">Your invite worked</h2>
          <p style="color:#d1fae5; margin:0; font-size:14px;">${params.inviteeName} just signed up</p>
        </div>
        <p style="color:#333; line-height:1.6;">
          Hi ${params.inviterName || "there"}, <strong>${params.inviteeName}</strong> just joined using your invite. When they confirm their first booking, you'll earn <strong>10 credits per Rp 100k</strong> they spend (cap 200), plus they get a 50-credit thank-you.
        </p>
        <a href="${SITE_URL}/profile/rewards" style="display:block; text-align:center; padding:14px; background:#0071CE; color:white; text-decoration:none; border-radius:12px; font-weight:bold; font-size:15px;">
          View your referrals
        </a>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
        <p style="color:#aaa; font-size:12px; text-align:center;">${SITE_NAME}</p>
      </div>
    `,
  });
}

// ── Referral: friend booked (notify inviter) ───────────────────────────

export async function sendReferralBookingInviterEmail(params: {
  to: string;
  inviterName: string;
  inviteeName: string;
  credits: number;
  productTitle: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `+${params.credits} credits — ${params.inviteeName} booked a tour`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#f59e0b,#d97706); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px; line-height:1;">💰</div>
          <h2 style="color:white; margin:12px 0 4px; font-size:24px;">+${params.credits} credits</h2>
          <p style="color:#fde68a; margin:0; font-size:14px;">${params.inviteeName} booked ${params.productTitle}</p>
        </div>
        <p style="color:#333; line-height:1.6;">
          Hi ${params.inviterName || "there"}, your friend <strong>${params.inviteeName}</strong> just confirmed a booking and we credited <strong>${params.credits} AI credits</strong> to your wallet. Every booking they make pays out.
        </p>
        <a href="${SITE_URL}/ai/wallet" style="display:block; text-align:center; padding:14px; background:#0071CE; color:white; text-decoration:none; border-radius:12px; font-weight:bold; font-size:15px;">
          See balance in AI Wallet
        </a>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
        <p style="color:#aaa; font-size:12px; text-align:center;">${SITE_NAME}</p>
      </div>
    `,
  });
}

// ── Two-Factor: email OTP code ─────────────────────────────────────────

export async function sendTwoFactorEmailOtp(params: {
  to: string;
  code: string;
  ipDescription?: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `Your ${SITE_NAME} sign-in code: ${params.code}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#0071CE,#005ba6); border-radius:16px; margin-bottom:24px;">
          <h2 style="color:white; margin:0; font-size:22px;">Your sign-in code</h2>
        </div>
        <p style="color:#333; line-height:1.6;">Enter this 6-digit code to finish signing in. Valid for 10 minutes.</p>
        <div style="background:#f7f9fc; border:1px solid #e5e7eb; border-radius:12px; padding:24px; margin:20px 0; text-align:center;">
          <p style="margin:0; font-family:monospace; font-size:32px; font-weight:900; letter-spacing:8px; color:#0071CE;">${params.code}</p>
        </div>
        ${params.ipDescription ? `<p style="color:#888; font-size:12px;">Sign-in attempt: ${params.ipDescription}</p>` : ""}
        <div style="background:#fff8eb; border:1px solid #fde6c2; border-radius:12px; padding:14px; margin-top:16px;">
          <p style="margin:0; color:#92400e; font-size:13px;">
            <strong>Didn&apos;t request this?</strong> Someone may know your password. <a href="${SITE_URL}/forgot-password" style="color:#92400e; font-weight:bold;">Change it now</a>.
          </p>
        </div>
      </div>
    `,
  });
}

// ── Two-Factor: enabled confirmation ───────────────────────────────────

export async function sendTwoFactorEnabledEmail(params: { to: string; name: string }) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `Two-factor authentication is now active`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color:#1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#10b981,#059669); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px;">🔒</div>
          <h2 style="color:white; margin:8px 0 0; font-size:22px;">2FA is on</h2>
        </div>
        <p style="color:#333; line-height:1.6;">
          Hi ${params.name || "there"}, two-factor authentication is now active. From now on, signing in needs a 6-digit code from your authenticator app.
        </p>
        <p style="color:#333; line-height:1.6;">Keep your backup codes somewhere safe. Lost both your phone and codes? Contact support.</p>
        <a href="${SITE_URL}/profile/security" style="display:block; text-align:center; padding:12px; background:#0071CE; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px; margin-top:16px;">Manage 2FA</a>
      </div>
    `,
  });
}

// ── Two-Factor: disabled confirmation ──────────────────────────────────

export async function sendTwoFactorDisabledEmail(params: { to: string; name: string; byAdmin?: boolean }) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: params.byAdmin ? `An admin disabled 2FA on your account` : `Two-factor authentication disabled`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color:#1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#f59e0b,#d97706); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px;">🔓</div>
          <h2 style="color:white; margin:8px 0 0; font-size:22px;">2FA is off</h2>
        </div>
        <p style="color:#333; line-height:1.6;">
          Hi ${params.name || "there"}, ${params.byAdmin ? "an admin disabled 2FA on your account." : "you disabled two-factor authentication."} Sign-in now needs only your password.
        </p>
        <p style="color:#333; line-height:1.6;">Didn&apos;t do this? Sign in immediately and re-enable 2FA, or <a href="${SITE_URL}/contact" style="color:#0071CE;">contact support</a>.</p>
      </div>
    `,
  });
}

// ── Two-Factor: admin reset (force re-enroll) ──────────────────────────

export async function sendTwoFactorAdminResetEmail(params: { to: string; name: string; reason?: string }) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `Two-factor authentication was reset`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color:#1a1a1a;">
        <div style="text-align:center; padding:24px 16px; background:linear-gradient(135deg,#0071CE,#005ba6); border-radius:16px; margin-bottom:24px;">
          <div style="font-size:40px;">🔁</div>
          <h2 style="color:white; margin:8px 0 0; font-size:22px;">2FA reset</h2>
        </div>
        <p style="color:#333; line-height:1.6;">
          Hi ${params.name || "there"}, an admin reset two-factor authentication on your account.${params.reason ? ` Reason: ${params.reason}.` : ""} Sign in with your password and enroll a new authenticator.
        </p>
        <a href="${SITE_URL}/profile/security" style="display:block; text-align:center; padding:12px; background:#0071CE; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px; margin-top:16px;">Re-enroll 2FA</a>
      </div>
    `,
  });
}

// ── Two-Factor: backup code used ───────────────────────────────────────

export async function sendTwoFactorBackupUsedEmail(params: { to: string; name: string; remaining: number }) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `A backup code was used to sign in`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color:#1a1a1a;">
        <p style="color:#333; line-height:1.6;">
          Hi ${params.name || "there"}, a backup code was just used to sign in to your ${SITE_NAME} account. You have <strong>${params.remaining}</strong> backup codes remaining.
        </p>
        ${params.remaining <= 3 ? `<p style="color:#92400e;"><strong>Heads up:</strong> consider regenerating your backup codes from your security page.</p>` : ""}
        <a href="${SITE_URL}/profile/security" style="display:block; text-align:center; padding:12px; background:#0071CE; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px; margin-top:16px;">View security settings</a>
      </div>
    `,
  });
}

// ── Two-Factor: generic security alert ─────────────────────────────────

export async function sendSecurityAlertEmail(params: { to: string; subject: string; body: string }) {
  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: params.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color:#1a1a1a;">
        <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#dc2626,#991b1b); border-radius:16px; margin-bottom:20px;">
          <div style="font-size:36px;">⚠️</div>
          <h2 style="color:white; margin:8px 0 0; font-size:20px;">Security alert</h2>
        </div>
        <p style="color:#333; line-height:1.6;">${params.body}</p>
        <a href="${SITE_URL}/profile/security" style="display:block; text-align:center; padding:12px; background:#0071CE; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:14px; margin-top:16px;">Review security</a>
      </div>
    `,
  });
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
