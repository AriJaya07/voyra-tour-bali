import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing verification token' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      tokenExpiry: { gte: new Date() },
    },
  })

  if (!user) {
    const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    // Redirect to login with error
    return NextResponse.redirect(
      `${SITE_URL}/login?error=InvalidOrExpiredToken`
    )
  }

  // Mark email as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      tokenExpiry: null,
    },
  })

  const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(
    `${SITE_URL}/login?verified=true`
  )
}
