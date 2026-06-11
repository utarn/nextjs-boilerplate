import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/magic-link'
import { createAuthSession, appUrl } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus, WebUserRole } from '@/generated/client'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.redirect(appUrl('/login?error=missing_token', request))
    }

    const result = await verifyMagicLink(token)

    if (!result.ok) {
      return NextResponse.redirect(appUrl(`/login?error=${result.error}`, request))
    }

    // Find or create user
    let user = await prisma.webUser.findUnique({
      where: { email: result.email },
    })

    if (!user) {
      user = await prisma.webUser.create({
        data: {
          email: result.email,
          displayName: result.email.split('@')[0],
          status: UserStatus.ACTIVE,
          role: WebUserRole.USER,
        },
      })
    }

    return createAuthSession(user, appUrl('/dashboard', request).toString())
  } catch (error) {
    console.error('Verify magic link error:', error)
    return NextResponse.redirect(appUrl('/login?error=verification_failed', request))
  }
}
