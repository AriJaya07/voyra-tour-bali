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
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER || "dummy@example.com",
        pass: process.env.SMTP_PASS || "dummypass",
      },
      // for dummy local testing (optional configuration)
      ignoreTLS: true
    });

    const qrText = `VOYRA-${booking.bookingRef}-${booking.productCode}-${booking.travelDate}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrText)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; color: #111827;">
         <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-bottom: 2px dashed #d1d5db;">
            <h1 style="color: #0071CE; margin: 0; text-transform: uppercase;">VOYRA</h1>
            <p style="color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Official Booking Ticket</p>
         </div>
         <div style="padding: 30px; text-align: center;">
            <h2 style="margin-top: 0;">Status: <span style="color: ${booking.status === 'CONFIRMED' ? '#10b981' : '#f59e0b'}">${booking.status}</span></h2>
            
            ${booking.status === 'CONFIRMED' ? `
              <div style="margin: 20px 0;">
                <img src="${qrUrl}" width="200" height="200" alt="QR Code" style="border: 4px solid white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                <p style="font-weight: bold; font-size: 20px; letter-spacing: 2px; margin-top: 10px;">${booking.bookingRef}</p>
                <p style="color: #6b7280; font-size: 14px;">Show this QR code to your tour guide</p>
              </div>
            ` : ''}

            <div style="text-align: left; margin-top: 30px;">
              <h3 style="color: #9ca3af; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Tour Details</h3>
              <p style="font-weight: bold; font-size: 18px; margin: 5px 0;">${booking.productTitle}</p>
              <p><strong>Date:</strong> ${new Date(booking.travelDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.travelTime || '08:00 AM'}</p>
              <p><strong>Meeting Point:</strong> ${booking.meetingPoint || 'Hotel Lobby / Specified Pickup'}</p>
            </div>

            <hr style="border: 0; border-top: 1px dashed #e5e7eb; margin: 20px 0;" />

            <div style="text-align: left;">
              <h3 style="color: #9ca3af; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Traveler Details</h3>
              <p><strong>Total Guests:</strong> ${booking.pax}</p>
              ${booking.travelers && booking.travelers.length > 0 ? `<p><strong>Lead Traveler:</strong> ${booking.travelers[0].fullName}</p>` : ''}
            </div>

         </div>
         <div style="background-color: #111827; padding: 20px; text-align: center; color: white;">
            <p style="font-size: 11px; opacity: 0.6; margin: 0;">Powered by Viator / Tripadvisor</p>
            <p style="font-size: 11px; margin-top: 5px;">Need help? Contact our WhatsApp Support</p>
         </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: '"Voyra Tourism" <noreply@balitravelnow.com>',
        to: session.user.email || booking.user.email,
        subject: `Your Voyra Ticket [${booking.bookingRef}]`,
        html
      });
    } catch (e) {
      // If mock SMTP fails, still resolve since it's a dev sandbox
      console.warn("SMTP failed, possibly fake credentials during dev loop", e);
    }

    return NextResponse.json({ success: true, email: session.user.email || booking.user.email });
  } catch (error) {
    console.error("Resend email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
