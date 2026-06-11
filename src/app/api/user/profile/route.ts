import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '@/lib/route-guard'

export async function GET(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      const dbUser = await prisma.webUser.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      })

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json(dbUser)
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
