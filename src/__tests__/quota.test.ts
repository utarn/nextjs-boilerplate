import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTodoCount, mockWebUserFindUnique } = vi.hoisted(() => ({
  mockTodoCount: vi.fn(),
  mockWebUserFindUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      count: mockTodoCount,
    },
    webUser: {
      findUnique: mockWebUserFindUnique,
    },
  },
}))

import { checkUserQuota, enforceUserQuota, getStorageUsage } from '@/lib/quota'

describe('quota', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkUserQuota', () => {
    it('should return correct quota info for todos type', async () => {
      mockTodoCount.mockResolvedValue(5)

      const result = await checkUserQuota(userId, 'todos')

      expect(mockTodoCount).toHaveBeenCalledWith({ where: { userId } })
      expect(result).toEqual({
        allowed: true,
        used: 5,
        limit: 1000,
        remaining: 995,
      })
    })

    it('should return not-allowed when todos quota is exceeded', async () => {
      mockTodoCount.mockResolvedValue(1000)

      const result = await checkUserQuota(userId, 'todos')

      expect(result).toEqual({
        allowed: false,
        used: 1000,
        limit: 1000,
        remaining: 0,
      })
    })

    it('should return correct quota info for files type', async () => {
      mockTodoCount.mockResolvedValue(3)

      const result = await checkUserQuota(userId, 'files')

      expect(mockTodoCount).toHaveBeenCalledWith({
        where: { userId, attachmentPath: { not: null } },
      })
      expect(result).toEqual({
        allowed: true,
        used: 3,
        limit: 1000,
        remaining: 997,
      })
    })

    it('should return correct quota info for storage type', async () => {
      const storageUsedBytes = BigInt(5 * 1048576) // 5 MB
      mockWebUserFindUnique.mockResolvedValue({
        storageUsedBytes,
      })

      const result = await checkUserQuota(userId, 'storage')

      expect(mockWebUserFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { storageUsedBytes: true },
      })
      expect(result).toEqual({
        allowed: true,
        used: 5,
        limit: 1000,
        remaining: 995,
      })
    })
  })

  describe('enforceUserQuota', () => {
    it('should throw when quota is exceeded', async () => {
      mockTodoCount.mockResolvedValue(1000)

      await expect(enforceUserQuota(userId, 'todos')).rejects.toThrow(
        'Quota exceeded: todos limit of 1000 reached',
      )
    })

    it('should not throw when under quota', async () => {
      mockTodoCount.mockResolvedValue(5)

      await expect(
        enforceUserQuota(userId, 'todos'),
      ).resolves.toBeUndefined()
    })
  })

  describe('getStorageUsage', () => {
    it('should return used/quota bytes for existing user', async () => {
      mockWebUserFindUnique.mockResolvedValue({
        storageUsedBytes: BigInt(1048576),
        storageQuotaBytes: BigInt(104857600),
      })

      const result = await getStorageUsage(userId)

      expect(mockWebUserFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { storageUsedBytes: true, storageQuotaBytes: true },
      })
      expect(result).toEqual({
        usedBytes: BigInt(1048576),
        quotaBytes: BigInt(104857600),
      })
    })

    it('should return zero values for non-existent user', async () => {
      mockWebUserFindUnique.mockResolvedValue(null)

      const result = await getStorageUsage('non-existent')

      expect(result).toEqual({
        usedBytes: BigInt(0),
        quotaBytes: BigInt(0),
      })
    })
  })
})
