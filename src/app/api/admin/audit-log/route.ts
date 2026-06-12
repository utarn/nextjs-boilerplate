import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/client'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'
import { AuditAction, AuditCategory } from '@/lib/audit-constants'

// Map actions to their categories
const ACTION_CATEGORY: Record<string, string> = {
  [AuditAction.USER_LOGIN]: AuditCategory.USER,
  [AuditAction.USER_LOGOUT]: AuditCategory.USER,
  [AuditAction.USER_CREATED]: AuditCategory.USER,
  [AuditAction.USER_UPDATED]: AuditCategory.USER,
  [AuditAction.USER_DELETED]: AuditCategory.USER,
  [AuditAction.USER_APPROVED]: AuditCategory.USER,
  [AuditAction.USER_REJECTED]: AuditCategory.USER,
  [AuditAction.USER_ACTIVATED]: AuditCategory.USER,
  [AuditAction.USER_DEACTIVATED]: AuditCategory.USER,
  [AuditAction.TODO_CREATED]: AuditCategory.TODO,
  [AuditAction.TODO_UPDATED]: AuditCategory.TODO,
  [AuditAction.TODO_DELETED]: AuditCategory.TODO,
  [AuditAction.TODO_COMPLETED]: AuditCategory.TODO,
  [AuditAction.EXPORT_CREATED]: AuditCategory.EXPORT,
  [AuditAction.EXPORT_COMPLETED]: AuditCategory.EXPORT,
  [AuditAction.QUEUE_JOB_RETRY]: AuditCategory.ADMIN,
  [AuditAction.QUEUE_JOB_CANCEL]: AuditCategory.ADMIN,
  [AuditAction.ADMIN_ACTION]: AuditCategory.ADMIN,
}

export async function GET(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async () => {
      const { searchParams } = new URL(request.url)
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
      const action = searchParams.get('action')
      const category = searchParams.get('category')
      const actor = searchParams.get('actor')
      const dateFrom = searchParams.get('dateFrom')
      const dateTo = searchParams.get('dateTo')
      const search = searchParams.get('search')

      const where: Prisma.AuditLogWhereInput = {}

      if (action) {
        where.action = action
      } else if (category) {
        // If a category is provided without a specific action, filter by all
        // actions in that category.
        const categoryActions = Object.entries(ACTION_CATEGORY)
          .filter(([, cat]) => cat === category)
          .map(([act]) => act)

        if (categoryActions.length > 0) {
          where.action = { in: categoryActions }
        }
      }

      if (actor) {
        where.user = { email: { contains: actor, mode: 'insensitive' } }
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom)
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
        }
      }

      if (search) {
        where.OR = [
          { entityType: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
        ]
      }

      const skip = (page - 1) * limit

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, displayName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ])

      return NextResponse.json({
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
