import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getUserInfo } from '@/lib/google-oauth'
import { createAuthSession, appUrl } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus, WebUserRole } from '@/generated/client'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    if (!code) {
      return NextResponse.redirect(appUrl('/login?error=missing_code', request))
    }

    const tokens = await exchangeCodeForTokens(code, request)
    const userInfo = await getUserInfo(tokens.access_token)

    if (!userInfo.email_verified) {
      return NextResponse.redirect(appUrl('/login?error=email_not_verified', request))
    }

    // Find or create user
    let user = await prisma.webUser.findUnique({
      where: { email: userInfo.email },
    })

    if (!user) {
      user = await prisma.webUser.create({
        data: {
          email: userInfo.email,
          displayName: userInfo.name,
          googleId: userInfo.sub,
          status: UserStatus.PENDING,
          role: WebUserRole.USER,
          emailVerifiedAt: new Date(),
        },
      })

      // Audit log user creation
      await logAuditEvent({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_CREATED,
        entityType: 'webUser',
        entityId: user.id,
        details: {
          email: user.email,
          displayName: user.displayName,
          method: 'google_oauth',
          status: UserStatus.PENDING,
        },
      })
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user = await prisma.webUser.update({
        where: { id: user.id },
        data: {
          googleId: userInfo.sub,
          emailVerifiedAt: new Date(),
        },
      })
    }

    return createAuthSession(user, appUrl('/dashboard', request).toString())
  } catch (error) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(appUrl('/login?error=auth_failed', request))
  }
}
