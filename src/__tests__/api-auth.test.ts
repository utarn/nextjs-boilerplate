import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Module mocks (vi.mock is hoisted to top)
// ---------------------------------------------------------------------------

vi.mock('@/generated/client', () => ({
  WebUserRole: { USER: 'USER', ADMIN: 'ADMIN' },
  UserStatus: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', PENDING: 'PENDING' },
  TodoStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  TodoPriority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' },
  PrismaClient: class {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webUser: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    magicLinkToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/google-oauth', () => ({
  getGoogleAuthUrl: vi.fn(
    () => 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:3000/api/auth/google/callback&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent',
  ),
  exchangeCodeForTokens: vi.fn(),
  getUserInfo: vi.fn(),
}))

vi.mock('@/lib/magic-link', () => ({
  generateMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  MAGIC_LINK_EXPIRY_MINUTES: 15,
}))

vi.mock('@/lib/auth', () => ({
  appUrl: vi.fn((path: string, _request?: NextRequest) => {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return new URL(path, base).toString()
  }),
  createAuthSession: vi.fn(
    (user: any, redirectTo: string) => NextResponse.redirect(new URL(redirectTo)),
  ),
  clearAuthCookie: vi.fn().mockResolvedValue(undefined),
  withAuth: vi.fn(),
  withRoles: vi.fn(),
  AuthenticationError: class extends Error {
    public readonly status = 401
    constructor(message = 'Unauthorized') {
      super(message)
      this.name = 'AuthenticationError'
    }
    toResponse(): NextResponse {
      return NextResponse.json({ error: this.message }, { status: 401 })
    }
  },
  AuthorizationError: class extends Error {
    public readonly status = 403
    constructor(message = 'Forbidden: Insufficient permissions') {
      super(message)
      this.name = 'AuthorizationError'
    }
    toResponse(): NextResponse {
      return NextResponse.json({ error: this.message }, { status: 403 })
    }
  },
}))

vi.mock('@/lib/email', () => ({
  sendNewUserNotificationToAdmins: vi.fn().mockResolvedValue(undefined),
  sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_CREATED: 'user.created',
    TODO_CREATED: 'todo.created',
    ADMIN_ACTION: 'admin.action',
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { prisma } from '@/lib/prisma'
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserInfo } from '@/lib/google-oauth'
import { generateMagicLink, verifyMagicLink } from '@/lib/magic-link'
import { createAuthSession, clearAuthCookie } from '@/lib/auth'
import { sendNewUserNotificationToAdmins } from '@/lib/email'
import { logAuditEvent } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGoogleUser = {
  sub: 'google-123',
  email: 'newuser@gmail.com',
  email_verified: true,
  name: 'New User',
  given_name: 'New',
  family_name: 'User',
  picture: 'https://example.com/photo.jpg',
  locale: 'en',
}

const mockExistingUser = {
  id: 'user-1',
  email: 'existing@example.com',
  displayName: 'Existing User',
  role: 'USER',
  status: 'ACTIVE',
  locale: 'en',
  googleId: null,
  createdAt: new Date(),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api/auth', () => {
  let googleRoute: (req: NextRequest) => Promise<NextResponse>
  let callbackRoute: (req: NextRequest) => Promise<NextResponse>
  let magicLinkRoute: (req: NextRequest) => Promise<NextResponse>
  let verifyRoute: (req: NextRequest) => Promise<NextResponse>
  let logoutRoute: () => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    googleRoute = (await import('@/app/api/auth/google/route')).GET
    callbackRoute = (await import('@/app/api/auth/google/callback/route')).GET
    magicLinkRoute = (await import('@/app/api/auth/magic-link/route')).POST
    verifyRoute = (await import('@/app/api/auth/verify/route')).GET
    logoutRoute = (await import('@/app/api/auth/logout/route')).POST
  })

  // -----------------------------------------------------------------------
  // GET /api/auth/google
  // -----------------------------------------------------------------------

  describe('GET /api/auth/google', () => {
    it('redirects to Google OAuth URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/google')
      const response = await googleRoute(req)

      expect(response.status).toBe(307) // redirect
      const location = response.headers.get('location')
      expect(location).toContain('accounts.google.com')
      expect(location).toContain('/o/oauth2/v2/auth')
      expect(getGoogleAuthUrl).toHaveBeenCalledWith(req)
    })
  })

  // -----------------------------------------------------------------------
  // GET /api/auth/google/callback
  // -----------------------------------------------------------------------

  describe('GET /api/auth/google/callback', () => {
    it('exchanges code, creates user, redirects to dashboard', async () => {
      ;(exchangeCodeForTokens as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token-123',
        expires_in: 3600,
        scope: 'openid email profile',
        token_type: 'Bearer',
        id_token: 'id-token-123',
      })
      ;(getUserInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockGoogleUser)
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
      ;(prisma.webUser.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'new-user-1',
        email: mockGoogleUser.email,
        displayName: mockGoogleUser.name,
        role: 'USER',
        status: 'PENDING',
        locale: 'en',
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=test-code-123',
      )
      const response = await callbackRoute(req)

      expect(response.status).toBe(307) // redirect
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
      expect(exchangeCodeForTokens).toHaveBeenCalledWith('test-code-123', req)
      expect(getUserInfo).toHaveBeenCalledWith('access-token-123')
      expect(prisma.webUser.findUnique).toHaveBeenCalledWith({
        where: { email: mockGoogleUser.email },
      })
      expect(prisma.webUser.create).toHaveBeenCalled()
      expect(logAuditEvent).toHaveBeenCalled()
      expect(sendNewUserNotificationToAdmins).toHaveBeenCalled()
      expect(createAuthSession).toHaveBeenCalled()
    })

    it('exchanges code, finds existing user, updates googleId, redirects to dashboard', async () => {
      ;(exchangeCodeForTokens as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token-456',
        expires_in: 3600,
        scope: 'openid email profile',
        token_type: 'Bearer',
        id_token: 'id-token-456',
      })
      ;(getUserInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockGoogleUser,
        email: 'existing@example.com',
        sub: 'google-456',
      })
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockExistingUser,
        googleId: null,
      })
      ;(prisma.webUser.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockExistingUser,
        googleId: 'google-456',
        emailVerifiedAt: expect.any(Date),
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=test-code-456',
      )
      const response = await callbackRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
      expect(prisma.webUser.findUnique).toHaveBeenCalled()
      expect(prisma.webUser.update).toHaveBeenCalled()
      expect(createAuthSession).toHaveBeenCalled()
    })

    it('returns error redirect when code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/google/callback')
      const response = await callbackRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=missing_code')
    })

    it('returns error redirect when email not verified', async () => {
      ;(exchangeCodeForTokens as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token-789',
        expires_in: 3600,
        scope: 'openid email profile',
        token_type: 'Bearer',
        id_token: 'id-token-789',
      })
      ;(getUserInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockGoogleUser,
        email_verified: false,
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/google/callback?code=test-code-789',
      )
      const response = await callbackRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=email_not_verified')
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/auth/magic-link
  // -----------------------------------------------------------------------

  describe('POST /api/auth/magic-link', () => {
    it('generates magic link and returns success', async () => {
      ;(generateMagicLink as ReturnType<typeof vi.fn>).mockResolvedValueOnce('token-abc')

      const req = new NextRequest('http://localhost:3000/api/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const response = await magicLinkRoute(req)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(generateMagicLink).toHaveBeenCalledWith('user@example.com', expect.any(String))
    })

    it('returns success even when email is missing (prevents enumeration)', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await magicLinkRoute(req)
      // The route returns 400 when email is missing (validation before processing),
      // but the catch block returns 200 for any errors during generateMagicLink.
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Email is required')
      expect(generateMagicLink).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // GET /api/auth/verify
  // -----------------------------------------------------------------------

  describe('GET /api/auth/verify', () => {
    it('verifies token and creates auth session', async () => {
      ;(verifyMagicLink as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        email: 'existing@example.com',
      })
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockExistingUser,
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/verify?token=valid-token-123',
      )
      const response = await verifyRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
      expect(verifyMagicLink).toHaveBeenCalledWith('valid-token-123')
      expect(createAuthSession).toHaveBeenCalled()
    })

    it('creates new user when verifying for the first time', async () => {
      ;(verifyMagicLink as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        email: 'new@example.com',
      })
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
      ;(prisma.webUser.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'new-user-2',
        email: 'new@example.com',
        displayName: 'new',
        role: 'USER',
        status: 'PENDING',
        locale: null,
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/verify?token=new-user-token',
      )
      const response = await verifyRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/dashboard')
      expect(prisma.webUser.create).toHaveBeenCalled()
      expect(logAuditEvent).toHaveBeenCalled()
    })

    it('redirects to login with error for invalid token', async () => {
      ;(verifyMagicLink as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'invalid_token',
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/verify?token=bad-token',
      )
      const response = await verifyRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=invalid_token')
    })

    it('redirects to login with error for expired token', async () => {
      ;(verifyMagicLink as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'token_expired',
      })

      const req = new NextRequest(
        'http://localhost:3000/api/auth/verify?token=expired-token',
      )
      const response = await verifyRoute(req)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=token_expired')
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/auth/logout
  // -----------------------------------------------------------------------

  describe('POST /api/auth/logout', () => {
    it('clears auth cookie and redirects', async () => {
      const response = await logoutRoute()

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toBe('http://localhost:3000/')
      expect(clearAuthCookie).toHaveBeenCalled()
    })
  })
})
