import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

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

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(user.email, verificationToken);
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
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration', details: error.message },
      { status: 500 }
    );
  }
}
