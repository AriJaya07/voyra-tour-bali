import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, callbackUrl } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      // Do not reveal if a user exists or not for security reasons
      return NextResponse.json(
        { message: 'If an account exists, a verification email has been sent.' },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'This email is already verified. Please log in.' },
        { status: 400 }
      );
    }

    // Backend Rate Limit Check: 5 minutes (300,000 ms)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    if (user.tokenExpiry) {
      const lastSentTime = user.tokenExpiry.getTime() - ONE_DAY_MS;
      const timeSinceLastSent = Date.now() - lastSentTime;

      // Allow a small buffer of 0 just in case servers are perfectly in sync
      if (timeSinceLastSent >= -1000 && timeSinceLastSent < FIVE_MINUTES_MS) {
        const remainingSeconds = Math.ceil((FIVE_MINUTES_MS - timeSinceLastSent) / 1000);
        return NextResponse.json(
          { 
            message: 'Please wait before requesting another email.',
            remainingSeconds 
          },
          { status: 429 }
        );
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + ONE_DAY_MS); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiry,
      }
    });

    try {
      await sendVerificationEmail(user.email, verificationToken, callbackUrl);
    } catch (emailErr) {
      console.error('[Email] Failed to send verification email during resend:', emailErr);
    }

    return NextResponse.json(
      { message: 'If an account exists, a verification email has been sent.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { message: 'An error occurred while resending the verification email' },
      { status: 500 }
    );
  }
}
