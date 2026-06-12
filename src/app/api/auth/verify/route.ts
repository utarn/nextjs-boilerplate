import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/magic-link'
import { createAuthSession, appUrl } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus, WebUserRole } from '@/generated/client'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { sendNewUserNotificationToAdmins } from '@/lib/email'

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
          status: UserStatus.PENDING,
          role: WebUserRole.USER,
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
          method: 'magic_link',
          status: UserStatus.PENDING,
        },
      })

      // Notify all ADMIN users about the new signup (fire-and-forget via
      // the email queue so SMTP failures don't crash the web server).
      sendNewUserNotificationToAdmins({
        userEmail: user.email,
        userDisplayName: user.displayName,
      }).catch((err) => {
        console.error('[auth] Failed to notify admins about new user:', err)
      })
    }

    return createAuthSession(user, appUrl('/dashboard', request).toString())
  } catch (error) {
    console.error('Verify magic link error:', error)
    return NextResponse.redirect(appUrl('/login?error=verification_failed', request))
  }
}
