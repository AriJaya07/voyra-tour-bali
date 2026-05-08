import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const callbackUrl = searchParams.get('callbackUrl')
  const SITE_URL = process.env.NEXTAUTH_URL
  if (!SITE_URL) {
    return NextResponse.json({ error: 'Server misconfiguration: NEXTAUTH_URL is not set' }, { status: 500 })
  }

  const buildRedirect = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params)
    if (callbackUrl) qs.set('callbackUrl', callbackUrl)
    return NextResponse.redirect(`${SITE_URL}/login?${qs.toString()}`)
  }

  if (!token) {
    return buildRedirect({ error: 'MissingToken' })
  }

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
    },
  })

  if (!user) {
    return buildRedirect({ error: 'InvalidToken' })
  }

  // Idempotent: already verified (e.g. mail scanner pre-fetched link first).
  if (user.emailVerified) {
    return buildRedirect({ verified: 'true' })
  }

  if (user.tokenExpiry && user.tokenExpiry < new Date()) {
    return buildRedirect({ error: 'ExpiredToken' })
  }

  // Mark verified. Keep token+expiry so subsequent clicks (scanner + user)
  // hit the idempotent branch above instead of "InvalidToken".
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
    },
  })

  return buildRedirect({ verified: 'true' })
}
