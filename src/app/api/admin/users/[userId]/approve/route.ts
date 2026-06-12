import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { UserStatus } from '@/generated/client'
import { handleRouteError, NotFoundError } from '@/lib/route-guard'
import { sendAccountApprovedEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// POST /api/admin/users/[userId]/approve
// Approve a user's account (set status to ACTIVE) and send them a branded
// "Account Approved" email.
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

      // Update user status to ACTIVE
      const updated = await prisma.webUser.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      })

      // Audit log
      await logAuditEvent({
        userId: admin.userId,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        entityType: 'webUser',
        entityId: userId,
        details: {
          action: 'approve',
          targetEmail: user.email,
          previousStatus: user.status,
        },
      })

      // Send branded "Account Approved" email (fire-and-forget via the
      // email queue so SMTP failures don't crash the web server).
      if (user.email) {
        await sendAccountApprovedEmail({
          to: user.email,
          displayName: user.displayName,
        }).catch((err) => {
          console.error('[admin] Failed to send approval email:', err)
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
