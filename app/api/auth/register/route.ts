import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, sendReferralSignupInviterEmail } from '@/lib/email';
import { verifyTurnstile } from '@/utils/verifyTurnstile';
import { ensureWelcomeGrant, grantCredits } from '@/lib/services/aiCreditService';
import {
  recordSignupFingerprint,
  hashRequestIp,
  getUserIpHash,
} from '@/lib/services/signupFingerprintService';

const REFERRAL_SIGNUP_BONUS_CREDITS = 50;
const REFERRAL_COOKIE_NAME = 'voyra_ref';

export async function POST(request: Request) {
  try {
    const { email, password, name, callbackUrl, captchaToken, referralCode: bodyCode } = await request.json();

    // Fall back to HttpOnly cookie if body didn't carry the code (deep-link signup).
    let referralCode: string | undefined = typeof bodyCode === 'string' ? bodyCode : undefined;
    if (!referralCode) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${REFERRAL_COOKIE_NAME}=([^;]+)`));
      if (match) referralCode = decodeURIComponent(match[1]);
    }

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

    // Capture signup fingerprint first so referral same-IP check can read it.
    await recordSignupFingerprint({ userId: user.id, req: request, phone: null });

    // Referral wire-up: code → 50 AI credit signup bonus, referredById link, inviter notify.
    if (typeof referralCode === 'string' && referralCode.trim()) {
      try {
        const code = referralCode.trim().toUpperCase();
        const ref = await prisma.referral.findUnique({
          where: { code },
          include: { inviter: { select: { id: true, email: true, name: true } } },
        });
        if (ref && ref.inviterId !== user.id) {
          // Same-IP fraud guard: if invitee signs up from same IP as inviter,
          // record but do not pay signup bonus + flag suspicious for admin review.
          const inviteeIp = hashRequestIp(request);
          const inviterIp = await getUserIpHash(ref.inviterId);
          const sameIp = inviteeIp && inviterIp && inviteeIp === inviterIp;

          await prisma.referral.update({
            where: { id: ref.id },
            data: {
              inviteeId: user.id,
              inviteeEmail: user.email,
              status: 'SIGNED_UP',
              suspiciousReason: sameIp ? 'SAME_IP_SIGNUP' : ref.suspiciousReason,
            },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { referredById: ref.inviterId },
          });

          if (!sameIp && !ref.firstSignupBonusGivenAt) {
            try {
              await grantCredits({
                userId: user.id,
                source: 'REFERRAL',
                amount: REFERRAL_SIGNUP_BONUS_CREDITS,
                expiresInDays: 365,
                refId: `REF_SIGNUP_${ref.id}`,
                reasonOverride: 'GRANT_REFERRAL_SIGNUP',
              });
              await prisma.referral.update({
                where: { id: ref.id },
                data: { firstSignupBonusGivenAt: new Date() },
              });
            } catch (grantErr) {
              console.error('[Referral] signup bonus grant failed:', grantErr);
            }
          }

          // Notify inviter (best-effort)
          if (!sameIp && ref.inviter?.email) {
            void sendReferralSignupInviterEmail({
              to: ref.inviter.email,
              inviterName: ref.inviter.name || '',
              inviteeName: name || user.email,
            }).catch((e) =>
              console.error('[Referral] inviter notify failed:', e instanceof Error ? e.message : e)
            );
          }
        }
      } catch (refErr) {
        console.error('[Referral] failed to apply code:', refErr);
      }
    }

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
