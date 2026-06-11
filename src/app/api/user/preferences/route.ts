import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { parseBody, handleRouteError } from '@/lib/route-guard'
import { prisma } from '@/lib/prisma'
import { isValidThemeKey, isValidColorMode } from '@/lib/theme-catalog'

interface PreferencesBody {
  theme?: string
  colorMode?: string
}

/**
 * PATCH /api/user/preferences
 * Accepts { theme?: string, colorMode?: "light" | "dark" | "system" }
 * Validates theme key against known presets and colorMode against valid values.
 * Updates user record in database.
 */
export async function PATCH(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      const { body, error } = await parseBody<PreferencesBody>(request)
      if (error) return error

      const { theme, colorMode } = body

      // Validate that at least one field is provided
      if (theme === undefined && colorMode === undefined) {
        return NextResponse.json(
          { error: 'At least one of theme or colorMode must be provided' },
          { status: 400 },
        )
      }

      // Validate theme key if provided
      if (theme !== undefined && theme !== null) {
        if (typeof theme !== 'string' || !isValidThemeKey(theme)) {
          return NextResponse.json(
            { error: `Invalid theme key: "${theme}". Must be a known preset from the theme catalog.` },
            { status: 400 },
          )
        }
      }

      // Validate colorMode if provided
      if (colorMode !== undefined && colorMode !== null) {
        if (typeof colorMode !== 'string' || !isValidColorMode(colorMode)) {
          return NextResponse.json(
            { error: `Invalid colorMode: "${colorMode}". Must be one of: light, dark, system.` },
            { status: 400 },
          )
        }
      }

      // Build update payload with only the provided fields
      const updateData: { theme?: string | null; colorMode?: string | null } = {}
      if (theme !== undefined) {
        updateData.theme = theme
      }
      if (colorMode !== undefined) {
        updateData.colorMode = colorMode
      }

      await prisma.webUser.update({
        where: { id: user.userId },
        data: updateData,
      })

      return NextResponse.json({
        success: true,
        message: 'Preferences updated',
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
