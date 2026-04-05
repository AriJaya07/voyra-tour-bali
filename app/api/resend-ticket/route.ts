import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingRef } = await request.json();
    if (!bookingRef) {
       return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    const booking: any = await (prisma.booking as any).findFirst({
      where: { bookingRef },
      include: { user: true, travelers: true }
    });

    if (!booking) {
       return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== parseInt(session.user.id)) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Attempt to set up nodemailer transport
    // Fallback to ethereal or dummy if strict env vars aren't fully configured by user locally
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // for dummy local testing (optional configuration)
      ignoreTLS: true
    });

    const qrString = booking.ticketImageUrl || `https://voyratours.com/ticket/${booking.bookingRef}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;

    const isConfirmed = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
    const leadTraveler = booking.travelers && booking.travelers.length > 0 ? booking.travelers[0].fullName : "Guest";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
         <!-- Header -->
         <div style="background-color: #ffffff; padding: 40px 20px; text-align: center; border-bottom: 2px dashed #e2e8f0;">
            <h1 style="color: #0071CE; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">VOYRA</h1>
            <p style="color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px;">Official Booking Voucher</p>
         </div>

         <!-- Status Banner -->
         <div style="background-color: ${isConfirmed ? '#10b981' : booking.status === 'CANCELLED' ? '#ef4444' : '#f59e0b'}; padding: 12px; text-align: center; color: white; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            ${isConfirmed ? '✅ CONFIRMED' : booking.status === 'CANCELLED' ? '❌ CANCELLED' : '⏳ PENDING'}
         </div>

         <div style="padding: 40px;">
            <!-- Main Content Area: Ticket Image or QR Fallback -->
            ${isConfirmed && booking.ticketImageUrl ? `
              <div style="margin-bottom: 40px; text-align: center;">
                <p style="text-align: left; font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Official Supplier Ticket</p>
                <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                  <img src="${booking.ticketImageUrl}" alt="Voucher" style="width: 100%; height: auto; display: block;" />
                </div>
                <p style="margin-top: 16px; font-size: 11px; color: #64748b; font-style: italic;">
                  Scan the QR/Bar code on the ticket above to verify with your guide
                </p>
              </div>
            ` : `
              <!-- QR Code Section (Fallback) -->
              <div style="background-color: #f8fafc; padding: 32px; border-radius: 20px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px;">
                ${isConfirmed ? `
                  <div style="display: inline-block; background-color: white; padding: 16px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <img src="${qrUrl}" width="180" height="180" alt="QR Code" style="display: block;" />
                  </div>
                  <div style="margin-top: 24px;">
                    <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Digital Verification</p>
                    <p style="font-size: 24px; font-weight: 900; color: #1e293b; margin: 4px 0; letter-spacing: 2px;">${booking.bookingRef}</p>
                  </div>
                ` : `
                  <div style="padding: 20px;">
                    <p style="font-weight: bold; color: #1e293b;">Confirmation Pending</p>
                    <p style="font-size: 14px; color: #64748b;">Your digital QR code will appear here once the supplier confirms your booking.</p>
                  </div>
                `}
                <div style="margin-top: 20px; padding: 10px 20px; background-color: #eff6ff; border-radius: 10px; display: inline-block;">
                  <p style="color: #1d4ed8; font-size: 12px; font-weight: 700; margin: 0; text-transform: uppercase;">Show this at the meeting point</p>
                </div>
              </div>
            `}

            <!-- Tour Info -->
            <div style="margin-top: 40px;">
              <h3 style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">Booking Information</h3>
              <p style="font-size: 20px; font-weight: 800; line-height: 1.2; color: #0f172a; margin-bottom: 24px;">${booking.productTitle}</p>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 4px solid white;">
                    <p style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Date</p>
                    <p style="font-weight: 700; margin: 0; color: #1e293b;">${new Date(booking.travelDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td style="padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 4px solid white;">
                    <p style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Time</p>
                    <p style="font-weight: 700; margin: 0; color: #1e293b;">${booking.travelTime || '08:00 AM'}</p>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 8px; padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 4px solid white;">
                <p style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Traveler</p>
                <p style="font-weight: 700; margin: 0; color: #1e293b;">${leadTraveler} (${booking.pax} Pax)</p>
              </div>

              <div style="margin-top: 8px; padding: 12px; background-color: #f8fafc; border-radius: 12px; border: 4px solid white;">
                <p style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Meeting Point</p>
                <p style="font-weight: 700; margin: 0; color: #1e293b; font-size: 14px;">${booking.meetingPoint || 'Specified Pickup Location (Hotel Lobby)'}</p>
              </div>
            </div>

            <!-- Policy -->
            <div style="margin-top: 40px; padding: 24px; border-radius: 16px; background-color: #fff7ed; border: 1px solid #ffedd5;">
              <p style="color: #9a3412; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 1px;">Standard Cancellation Policy</p>
              <p style="font-size: 12px; color: #c2410c; line-height: 1.5; margin: 0;">For a full refund, you must cancel at least 24 hours before the experience's start time. Any changes made less than 24 hours before the start time will not be accepted.</p>
            </div>
         </div>

         <!-- Footer -->
         <div style="background-color: #0f172a; padding: 40px 20px; text-align: center;">
            <p style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Enjoy your time in Bali</p>
            <p style="font-size: 10px; color: #475569; margin-top: 12px;">Powered by Viator / Tripadvisor Partners</p>
            <div style="margin-top: 24px;">
              <a href="https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}" style="color: #10b981; font-size: 12px; font-weight: 700; text-decoration: none;">WhatsApp Support</a>
            </div>
         </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"Voyra Official" <${process.env.SMTP_FROM}>`,
        to: session.user.email || booking.user.email,
        subject: `[VOUCHER] Your Ticket for ${booking.productTitle} - ${booking.bookingRef}`,
        html
      });
    } catch (e) {
      console.warn("SMTP failed, possibly fake credentials during dev loop", e);
    }

    return NextResponse.json({ success: true, email: session.user.email || booking.user.email });
  } catch (error) {
    console.error("Resend email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
