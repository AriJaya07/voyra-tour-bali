import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { message: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { message: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        // Also verify email if not yet verified (they proved ownership via email)
        emailVerified: true,
        verificationToken: null,
        tokenExpiry: null,
      },
    })

    return NextResponse.json(
      { message: 'Password reset successfully. You can now sign in with your new password.' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
