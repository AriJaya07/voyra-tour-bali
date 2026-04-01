import nodemailer from "nodemailer"

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
const SITE_NAME = "Voyra Bali Tour"

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

// ── Email Verification ──────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${SITE_URL}/api/auth/verify?token=${token}`

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
}) {
  const ticketUrl = `${SITE_URL}/ticket/${params.ticketToken}`

  await transporter.sendMail({
    from: FROM,
    to: params.email,
    subject: `Booking Confirmed — ${params.productTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #25D366; margin-bottom: 8px;">Booking Confirmed!</h2>
        <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
          Hi ${params.userName || "Traveler"}, your booking has been confirmed. Here are the details:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 14px;">Booking Ref</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right;">${params.bookingRef}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 14px;">Tour</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right;">${params.productTitle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 14px;">Date</td>
            <td style="padding: 10px 0; text-align: right;">${params.travelDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 14px;">Travelers</td>
            <td style="padding: 10px 0; text-align: right;">${params.pax} person(s)</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888; font-size: 14px;">Total Paid</td>
            <td style="padding: 10px 0; font-weight: bold; font-size: 18px; text-align: right;">${params.totalPrice}</td>
          </tr>
        </table>

        <a href="${ticketUrl}"
           style="display: inline-block; width: 100%; text-align: center; padding: 14px 0; background: #0071CE; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-sizing: border-box;">
          View Your Ticket & QR Code
        </a>

        <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.5;">
          Show the QR code at the destination for entry. You can also access your ticket from your
          <a href="${SITE_URL}/profile">profile page</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          ${SITE_NAME} — Your trusted Bali travel companion
        </p>
      </div>
    `,
  })
}
