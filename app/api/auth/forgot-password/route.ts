import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    })

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json(
      { message: 'If an account exists with this email, a password reset link has been sent.' },
      { status: 200 }
    )

    if (!user || user.provider === 'google') {
      return successResponse
    }

    // Rate limit: 1 reset email per 5 minutes
    if (user.resetTokenExpiry) {
      const ONE_HOUR_MS = 60 * 60 * 1000
      const FIVE_MINUTES_MS = 5 * 60 * 1000
      const lastSentTime = user.resetTokenExpiry.getTime() - ONE_HOUR_MS
      const timeSinceLastSent = Date.now() - lastSentTime

      if (timeSinceLastSent >= 0 && timeSinceLastSent < FIVE_MINUTES_MS) {
        const remainingSeconds = Math.ceil((FIVE_MINUTES_MS - timeSinceLastSent) / 1000)
        return NextResponse.json(
          {
            message: 'Please wait before requesting another reset email.',
            remainingSeconds,
          },
          { status: 429 }
        )
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    try {
      await sendPasswordResetEmail(user.email, resetToken)
    } catch (emailErr) {
      console.error('[Email] Failed to send password reset email:', emailErr)
    }

    return successResponse
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
