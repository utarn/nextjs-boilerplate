import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { WebUserRole, UserStatus } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import type { WebUser } from '@/generated/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an absolute URL using the configured public app URL.
 * Falls back to request.url when NEXT_PUBLIC_APP_URL is not set (dev).
 */
export function appUrl(path: string, request?: NextRequest): URL {
  const base = process.env.NEXT_PUBLIC_APP_URL || request?.url || 'http://localhost:3000'
  return new URL(path, base)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JWTPayload {
  userId: string
  email: string
  displayName: string
  role: WebUserRole
  iat?: number
  exp?: number
}

// ---------------------------------------------------------------------------
// Custom error classes for auth guard wrappers
// ---------------------------------------------------------------------------

export class AuthenticationError extends Error {
  public readonly status = 401

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthenticationError'
  }

  toResponse(): NextResponse {
    return NextResponse.json({ error: this.message }, { status: this.status })
  }
}

export class AuthorizationError extends Error {
  public readonly status = 403

  constructor(message = 'Forbidden: Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }

  toResponse(): NextResponse {
    return NextResponse.json({ error: this.message }, { status: this.status })
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.ENCRYPTION_SECRET || 'fallback-secret-key'
const COOKIE_NAME = 'auth_token'
const TOKEN_EXPIRY = '24h'

/**
 * Cookie attributes defined in one place so every auth-route uses the same
 * security settings (httpOnly, secure, sameSite, maxAge, path).
 */
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/',
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)
}

/**
 * Create a full auth session: generate a JWT, set the auth cookie on a
 * NextResponse redirect, and return the response. This is the single source of
 * truth for "generate JWT -> set auth cookie -> redirect".
 *
 * @param user  - A user-like object with id, email, displayName, role.
 * @param redirectTo - Absolute URL string to redirect to.
 */
export function createAuthSession(
  user: Pick<WebUser, 'id' | 'email' | 'displayName' | 'role' | 'locale'>,
  redirectTo: string,
): NextResponse {
  const jwtToken = generateToken({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  })

  const response = NextResponse.redirect(new URL(redirectTo))
  response.cookies.set(COOKIE_NAME, jwtToken, AUTH_COOKIE_OPTIONS)

  // If the user has a saved locale preference, set the NEXT_LOCALE cookie
  if (user.locale) {
    response.cookies.set('NEXT_LOCALE', user.locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax' as const,
    })
  }

  return response
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(COOKIE_NAME)?.value
  return token || null
}

// ---------------------------------------------------------------------------
// Request-level helpers
// ---------------------------------------------------------------------------

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

async function requireAuth(request: NextRequest): Promise<JWTPayload | null> {
  return getUserFromRequest(request)
}

// ---------------------------------------------------------------------------
// Auth guard wrappers: withAuth / withRoles
// ---------------------------------------------------------------------------

/**
 * Extract the authenticated user from the request and pass it to the handler.
 * Throws `AuthenticationError` when no valid session is found or the user's
 * status is not ACTIVE.
 *
 * @example
 * ```ts
 * // Require authentication in an API route
 * export async function GET(request: NextRequest) {
 *   try {
 *     return await withAuth(request, async (user) => {
 *       const todos = await prisma.todo.findMany({
 *         where: { userId: user.userId },
 *       })
 *       return NextResponse.json(todos)
 *     })
 *   } catch (err) {
 *     return handleRouteError(err)
 *   }
 * }
 * ```
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (user: JWTPayload) => Promise<T>,
): Promise<T> {
  const user = await requireAuth(request)
  if (!user) {
    throw new AuthenticationError()
  }

  // Verify the user still has ACTIVE status in the database
  const dbUser = await prisma.webUser.findUnique({
    where: { id: user.userId },
    select: { status: true },
  })

  if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
    throw new AuthenticationError('Account is not active')
  }

  return handler(user)
}

/**
 * Like `withAuth`, but also enforces that the user holds one of the given roles.
 * Throws `AuthorizationError` when the role does not match.
 *
 * @example
 * ```ts
 * // Require ADMIN role in an API route
 * export async function DELETE(request: NextRequest) {
 *   try {
 *     return await withRoles(request, [WebUserRole.ADMIN], async (user) => {
 *       // admin-only deletion logic
 *       return NextResponse.json({ success: true })
 *     })
 *   } catch (err) {
 *     return handleRouteError(err)
 *   }
 * }
 * ```
 */
export async function withRoles<T>(
  request: NextRequest,
  roles: WebUserRole[],
  handler: (user: JWTPayload) => Promise<T>,
): Promise<T> {
  return withAuth(request, (user) => {
    if (!roles.includes(user.role)) {
      throw new AuthorizationError()
    }
    return handler(user)
  })
}
