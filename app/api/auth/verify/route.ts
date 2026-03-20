import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/login?error=MissingToken`)
  }

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
    },
  })

  if (!user) {
    return NextResponse.redirect(`${SITE_URL}/login?error=InvalidToken`)
  }

  if (user.tokenExpiry && user.tokenExpiry < new Date()) {
    return NextResponse.redirect(`${SITE_URL}/login?error=ExpiredToken`)
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

  return NextResponse.redirect(`${SITE_URL}/login?verified=true`)
}
