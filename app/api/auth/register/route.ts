import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';
import { verifyTurnstile } from '@/utils/verifyTurnstile';
import { ensureWelcomeGrant } from '@/lib/services/aiCreditService';
import { recordSignupFingerprint } from '@/lib/services/signupFingerprintService';

export async function POST(request: Request) {
  try {
    const { email, password, name, callbackUrl, captchaToken, referralCode } = await request.json();

    const captchaOk = await verifyTurnstile(captchaToken);
    if (!captchaOk) {
      return NextResponse.json(
        { message: 'Captcha verification failed. Please try again.' },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (user) {
      // If user registered via Google, don't allow password registration
      if (user.provider === 'google') {
        return NextResponse.json(
          { message: 'This email is linked to a Google account. Please sign in with Google.' },
          { status: 400 }
        );
      }

      if (user.emailVerified) {
        return NextResponse.json(
          { message: 'User with this email already exists and is verified. Please log in.' },
          { status: 400 }
        );
      } else {
        // User exists but is unverified. Update password and send new token.
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            verificationToken,
            tokenExpiry,
            name: name || user.name, // update name if provided
          }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: emailLower,
          name,
          password: hashedPassword,
          role: 'USER',
          verificationToken,
          tokenExpiry,
        }
      });
    }

    // Referral wire-up: if registered with a code, mark referral SIGNED_UP
    if (typeof referralCode === "string" && referralCode.trim()) {
      try {
        const code = referralCode.trim().toUpperCase();
        const ref = await prisma.referral.findUnique({ where: { code } });
        if (ref && ref.inviterId !== user.id) {
          await prisma.referral.update({
            where: { id: ref.id },
            data: {
              inviteeId: user.id,
              inviteeEmail: user.email,
              status: "SIGNED_UP",
            },
          });
          // Award signup bonus to invitee (200 pts)
          await prisma.loyaltyAccount.upsert({
            where: { userId: user.id },
            update: { pointsBalance: { increment: 200 } },
            create: { userId: user.id, pointsBalance: 200 },
          });
          await prisma.loyaltyLedger.create({
            data: { userId: user.id, delta: 200, reason: "SIGNUP", refId: code },
          });
        }
      } catch (refErr) {
        console.error('[Referral] failed to apply code:', refErr);
      }
    }

    // Capture signup fingerprint (anti-fraud) — non-blocking, best-effort
    void recordSignupFingerprint({ userId: user.id, req: request, phone: null });

    // AI welcome grant — idempotent, non-blocking
    try {
      await ensureWelcomeGrant(user.id);
    } catch (welcomeErr) {
      console.error('[AI] Failed to grant welcome credits:', welcomeErr);
    }

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(user.email, verificationToken, callbackUrl);
    } catch (emailErr) {
      console.error('[Email] Failed to send verification email:', emailErr);
    }

    return NextResponse.json(
      {
        message: 'Registration successful! Please check your email to verify your account.',
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
