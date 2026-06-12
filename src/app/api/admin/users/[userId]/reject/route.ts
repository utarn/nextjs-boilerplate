import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { UserStatus } from '@/generated/client'
import { handleRouteError, NotFoundError } from '@/lib/route-guard'
import {
  sendAccountRejectedEmail,
} from '@/lib/email'

// ---------------------------------------------------------------------------
// POST /api/admin/users/[userId]/reject
// Reject a user's account (set status to INACTIVE) and send them a branded
// "Account Rejected" email.
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params
    return await withRoles(request, ['ADMIN'], async (admin) => {
      const user = await prisma.webUser.findUnique({ where: { id: userId } })

      if (!user) {
        throw new NotFoundError('User not found')
      }

      // Update user status to INACTIVE (marks the account as rejected /
      // deactivated)
      const updated = await prisma.webUser.update({
        where: { id: userId },
        data: { status: UserStatus.INACTIVE },
      })

      // Audit log
      await logAuditEvent({
        userId: admin.userId,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        entityType: 'webUser',
        entityId: userId,
        details: {
          action: 'reject',
          targetEmail: user.email,
          previousStatus: user.status,
        },
      })

      // Send branded "Account Rejected" email (fire-and-forget so SMTP
      // failures don't crash the web server).
      if (user.email) {
        await sendAccountRejectedEmail({
          to: user.email,
          displayName: user.displayName,
        }).catch((err) => {
          console.error('[admin] Failed to send rejection email:', err)
        })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          status: updated.status,
          role: updated.role,
        },
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
