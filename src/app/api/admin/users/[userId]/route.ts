import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { UserStatus } from '@/generated/client'
import { handleRouteError, NotFoundError, parseBody } from '@/lib/route-guard'
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from '@/lib/email'

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/[userId]
// Update a user's account status: approve, reject, activate, or deactivate.
// Sends a branded email when the action is approve/reject/activate.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params
    return await withRoles(request, ['ADMIN'], async (admin) => {
      const { body, error } = await parseBody<{ action: string }>(request)
      if (error) return error

      const user = await prisma.webUser.findUnique({ where: { id: userId } })
      if (!user) {
        throw new NotFoundError('User not found')
      }

      let newStatus: string
      switch (body.action) {
        case 'approve':
          newStatus = UserStatus.ACTIVE
          break
        case 'reject':
          newStatus = UserStatus.INACTIVE
          break
        case 'activate':
          newStatus = UserStatus.ACTIVE
          break
        case 'deactivate':
          newStatus = UserStatus.INACTIVE
          break
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 },
          )
      }

      const updated = await prisma.webUser.update({
        where: { id: userId },
        data: { status: newStatus as UserStatus },
      })

      // Audit log
      await logAuditEvent({
        userId: admin.userId,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        entityType: 'webUser',
        entityId: userId,
        details: {
          action: body.action,
          targetEmail: user.email,
          previousStatus: user.status,
        },
      })

      // Send branded email (fire-and-forget so SMTP failures don't crash)
      if (user.email) {
        if (body.action === 'approve' || body.action === 'activate') {
          await sendAccountApprovedEmail({
            to: user.email,
            displayName: user.displayName,
          }).catch((err: Error) => {
            console.error('[admin] Failed to send approval email:', err)
          })
        } else if (body.action === 'reject') {
          await sendAccountRejectedEmail({
            to: user.email,
            displayName: user.displayName,
          }).catch((err: Error) => {
            console.error('[admin] Failed to send rejection email:', err)
          })
        }
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
