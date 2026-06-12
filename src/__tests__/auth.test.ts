import { describe, it, expect } from 'vitest'
import { generateToken, verifyToken } from '@/lib/auth'

describe('auth', () => {
  describe('generateToken/verifyToken', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'USER' as const,
    }

    it('should generate and verify a valid token', () => {
      const token = generateToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(mockPayload.userId)
      expect(decoded!.email).toBe(mockPayload.email)
      expect(decoded!.displayName).toBe(mockPayload.displayName)
      expect(decoded!.role).toBe(mockPayload.role)
    })

    it('should return null for invalid tokens', () => {
      const decoded = verifyToken('invalid-token')
      expect(decoded).toBeNull()
    })

    it('should include iat and exp in the decoded token', () => {
      const token = generateToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.iat).toBeDefined()
      expect(decoded!.exp).toBeDefined()
    })
  })
})
