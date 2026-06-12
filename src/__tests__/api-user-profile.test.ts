import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock user
// ---------------------------------------------------------------------------
const mockUser = {
  userId: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'USER' as const,
}

// ---------------------------------------------------------------------------
// Module mocks (vi.mock is hoisted to top)
// ---------------------------------------------------------------------------

vi.mock('@/generated/client', () => ({
  WebUserRole: { USER: 'USER', ADMIN: 'ADMIN' },
  UserStatus: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', PENDING: 'PENDING' },
  PrismaClient: class {},
}))

vi.mock('@/lib/auth', () => {
  class MockAuthenticationError extends Error {
    public readonly status = 401
    constructor(message = 'Unauthorized') {
      super(message)
      this.name = 'AuthenticationError'
    }
    toResponse(): NextResponse {
      return NextResponse.json({ error: this.message }, { status: 401 })
    }
  }
  class MockAuthorizationError extends Error {
    public readonly status = 403
    constructor(message = 'Forbidden: Insufficient permissions') {
      super(message)
      this.name = 'AuthorizationError'
    }
    toResponse(): NextResponse {
      return NextResponse.json({ error: this.message }, { status: 403 })
    }
  }
  return {
    withAuth: vi.fn((_req: NextRequest, handler: (user: typeof mockUser) => unknown) =>
      handler(mockUser),
    ),
    withRoles: vi.fn(),
    AuthenticationError: MockAuthenticationError,
    AuthorizationError: MockAuthorizationError,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const { isValidThemeKey, isValidColorMode } = vi.hoisted(() => ({
  isValidThemeKey: vi.fn(),
  isValidColorMode: vi.fn(),
}))

vi.mock('@/lib/theme-catalog', () => ({
  isValidThemeKey,
  isValidColorMode,
  THEME_CATEGORIES: ['professional', 'minimal', 'vibrant', 'dark', 'playful', 'nature', 'editorial', 'other'],
  VALID_COLOR_MODES: ['light', 'dark', 'system'],
  CATEGORY_LABELS: {
    professional: 'Professional',
    minimal: 'Minimal',
  },
  THEME_CATALOG: [],
  getThemesByCategory: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api/user/profile', () => {
  let GET: (req: NextRequest) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    GET = (await import('@/app/api/user/profile/route')).GET
  })

  describe('GET /api/user/profile', () => {
    it('returns user profile for authenticated user', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'USER',
        createdAt: new Date('2024-01-01'),
      }
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfile)

      const req = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.email).toBe('test@example.com')
      expect(data.displayName).toBe('Test User')
      expect(prisma.webUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      })
    })

    it('returns 404 when user not found', async () => {
      ;(prisma.webUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(req)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })
})

describe('api/user/preferences', () => {
  let PATCH: (req: NextRequest) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    PATCH = (await import('@/app/api/user/preferences/route')).PATCH
  })

  describe('PATCH /api/user/preferences', () => {
    it('updates theme', async () => {
      ;(isValidThemeKey as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)
      ;(prisma.webUser.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'user-1',
        theme: 'modern-minimal',
        colorMode: null,
      })

      const req = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme: 'modern-minimal' }),
      })

      const response = await PATCH(req)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(prisma.webUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { theme: 'modern-minimal' },
      })
    })

    it('updates colorMode', async () => {
      ;(isValidColorMode as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)
      ;(prisma.webUser.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'user-1',
        theme: null,
        colorMode: 'dark',
      })

      const req = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ colorMode: 'dark' }),
      })

      const response = await PATCH(req)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(prisma.webUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { colorMode: 'dark' },
      })
    })

    it('returns 400 when no fields provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await PATCH(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('At least one of theme or colorMode must be provided')
    })

    it('returns 400 for invalid theme', async () => {
      ;(isValidThemeKey as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme: 'invalid-theme' }),
      })

      const response = await PATCH(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid theme key')
    })

    it('returns 400 for invalid colorMode', async () => {
      ;(isValidColorMode as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ colorMode: 'invalid-mode' }),
      })

      const response = await PATCH(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid colorMode')
    })
  })
})
