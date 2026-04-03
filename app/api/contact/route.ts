import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, subject, message } = await req.json();

    if (!name || !email || !message || !subject) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Send notification email to the business
    await sendEmail({
      to: process.env.EMAIL_FROM || "info@balitravelnow.com",
      subject: `[Contact Form] ${subject} — from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0071CE;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px 0; font-weight: 600; color: #555; width: 140px;">Name</td><td style="padding: 8px 0; color: #222;">${name}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Email</td><td style="padding: 8px 0; color: #222;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Phone / WA</td><td style="padding: 8px 0; color: #222;">${phone || "—"}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Subject</td><td style="padding: 8px 0; color: #222;">${subject}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #0071CE;">
            <p style="font-weight: 600; color: #555; margin: 0 0 8px;">Message:</p>
            <p style="color: #333; margin: 0; line-height: 1.6;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">Sent from balitravelnow.com Contact Form</p>
        </div>
      `,
    });

    // Send auto-reply to customer
    await sendEmail({
      to: email,
      subject: "We received your message — Bali Travel Now",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0071CE;">Thank you, ${name}! 🌴</h2>
          <p style="color: #444; line-height: 1.6;">
            We've received your message about <strong>${subject}</strong> and our team will get back to you within <strong>24 hours</strong>.
          </p>
          <p style="color: #444; line-height: 1.6;">
            In the meantime, you can also reach us on WhatsApp for a faster response:
          </p>
          <a href="https://wa.me/6281234567890" style="display: inline-block; margin-top: 8px; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Chat on WhatsApp
          </a>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">
            Bali Travel Now · balitravelnow.com · Bali, Indonesia
          </p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Message sent successfully." }, { status: 200 });
  } catch (error) {
    console.error("[contact/route] Error:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
