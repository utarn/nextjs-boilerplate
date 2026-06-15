import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'

// ---------------------------------------------------------------------------
// GET /api/admin/users
// List all users with optional status filter and search query.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async () => {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') || undefined
      const search = searchParams.get('search') || undefined

      const where: Record<string, unknown> = {}
      if (status) {
        where.status = status
      }
      if (search) {
        where.email = { contains: search, mode: 'insensitive' as const }
      }

      const [users, total] = await Promise.all([
        prisma.webUser.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.webUser.count({ where }),
      ])

      return NextResponse.json({ users, total })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
