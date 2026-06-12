import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { handleRouteError } from '@/lib/route-guard'
import { prisma } from '@/lib/prisma'

const SUPPORTED_LOCALES = ['en', 'th'] as const

/**
 * PATCH /api/user/locale
 * Accepts { locale: "en" | "th" }
 * Updates the user's locale preference in the database.
 */
export async function PATCH(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      let body: { locale?: string }
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const { locale } = body

      if (!locale || typeof locale !== 'string') {
        return NextResponse.json(
          { error: 'locale is required and must be a string' },
          { status: 400 },
        )
      }

      if (!SUPPORTED_LOCALES.includes(locale as typeof SUPPORTED_LOCALES[number])) {
        return NextResponse.json(
          {
            error: `Unsupported locale: "${locale}". Must be one of: ${SUPPORTED_LOCALES.join(', ')}.`,
          },
          { status: 400 },
        )
      }

      await prisma.webUser.update({
        where: { id: user.userId },
        data: { locale },
      })

      return NextResponse.json({ success: true })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
