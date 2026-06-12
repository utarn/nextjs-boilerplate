import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isValidEmail, generateMagicLink, verifyMagicLink } from '@/lib/magic-link'

const { mockCreateToken, mockFindUniqueToken, mockUpdateToken, mockSendMagicLinkEmail } =
  vi.hoisted(() => ({
    mockCreateToken: vi.fn(),
    mockFindUniqueToken: vi.fn(),
    mockUpdateToken: vi.fn(),
    mockSendMagicLinkEmail: vi.fn(),
  }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    magicLinkToken: {
      create: mockCreateToken,
      findUnique: mockFindUniqueToken,
      update: mockUpdateToken,
    },
  },
}))

vi.mock('@/lib/email', () => ({
  sendMagicLinkEmail: mockSendMagicLinkEmail,
}))

describe('magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.user@domain.co')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
      expect(isValidEmail('a@b.cd')).toBe(true)
    })

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('not-an-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      expect(isValidEmail('user name@example.com')).toBe(false)
    })
  })

  describe('generateMagicLink', () => {
    it('should create a token, store it in DB, and send email', async () => {
      const email = 'test@example.com'
      const baseUrl = 'http://localhost:3000'
      const beforeTest = Date.now()

      mockCreateToken.mockResolvedValue({ id: 'token-id-1' })

      const token = await generateMagicLink(email, baseUrl)

      // Returns a hex string from crypto.randomBytes(32)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes -> 64 hex chars

      // Verify prisma.magicLinkToken.create was called with the right data
      expect(mockCreateToken).toHaveBeenCalledTimes(1)
      const createCall = mockCreateToken.mock.calls[0][0]
      expect(createCall.data.email).toBe(email)
      expect(createCall.data.token).toBe(token)
      expect(createCall.data.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTest)

      // Verify sendMagicLinkEmail was called with the correct URL
      expect(mockSendMagicLinkEmail).toHaveBeenCalledTimes(1)
      const emailUrl = mockSendMagicLinkEmail.mock.calls[0][1] as string
      expect(emailUrl).toContain(`/api/auth/verify?token=${token}`)
    })
  })

  describe('verifyMagicLink', () => {
    const futureDate = new Date(Date.now() + 3_600_000) // 1 hour from now

    it('should return {ok: true, email} for valid unused token', async () => {
      mockFindUniqueToken.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'valid-token',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      })
      mockUpdateToken.mockResolvedValue({})

      const result = await verifyMagicLink('valid-token')

      expect(result).toEqual({ ok: true, email: 'test@example.com' })

      expect(mockUpdateToken).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { usedAt: expect.any(Date) },
      })
    })

    it('should return invalid_token error when token does not exist', async () => {
      mockFindUniqueToken.mockResolvedValue(null)

      const result = await verifyMagicLink('non-existent-token')

      expect(result).toEqual({ ok: false, error: 'invalid_token' })
      expect(mockUpdateToken).not.toHaveBeenCalled()
    })

    it('should return token_used error when token already used', async () => {
      mockFindUniqueToken.mockResolvedValue({
        id: 'token-2',
        email: 'test@example.com',
        token: 'used-token',
        expiresAt: futureDate,
        usedAt: new Date(),
        createdAt: new Date(),
      })

      const result = await verifyMagicLink('used-token')

      expect(result).toEqual({ ok: false, error: 'token_used' })
      expect(mockUpdateToken).not.toHaveBeenCalled()
    })

    it('should return token_expired error when past expiry', async () => {
      mockFindUniqueToken.mockResolvedValue({
        id: 'token-3',
        email: 'test@example.com',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 3_600_000), // 1 hour ago
        usedAt: null,
        createdAt: new Date(),
      })

      const result = await verifyMagicLink('expired-token')

      expect(result).toEqual({ ok: false, error: 'token_expired' })
      expect(mockUpdateToken).not.toHaveBeenCalled()
    })
  })
})
