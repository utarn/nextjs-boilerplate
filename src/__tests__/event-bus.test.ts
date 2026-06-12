import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPublish } = vi.hoisted(() => ({
  mockPublish: vi.fn(),
}))

// Must use a regular function (not an arrow function) so that `new Redis()`
// works — arrow functions lack the [[Construct]] internal method.
vi.mock('ioredis', () => ({
  default: function RedisMock() {
    return { publish: mockPublish }
  },
}))

vi.mock('@/lib/redis', () => ({
  getRedisConnection: vi.fn(() => ({ host: 'localhost', port: 6379, db: 0 })),
}))

import { eventBus } from '@/lib/event-bus'

describe('event-bus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('todoCreated', () => {
    it('should publish correct payload to todo:created channel', async () => {
      const payload = { userId: 'user-1', todoId: 'todo-1', title: 'My todo' }

      await eventBus.todoCreated(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'todo:created',
        JSON.stringify(payload),
      )
    })
  })

  describe('todoUpdated', () => {
    it('should publish correct payload to todo:updated channel', async () => {
      const payload = { userId: 'user-1', todoId: 'todo-1', status: 'COMPLETED' }

      await eventBus.todoUpdated(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'todo:updated',
        JSON.stringify(payload),
      )
    })
  })

  describe('todoDeleted', () => {
    it('should publish correct payload to todo:deleted channel', async () => {
      const payload = { userId: 'user-1', todoId: 'todo-1' }

      await eventBus.todoDeleted(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'todo:deleted',
        JSON.stringify(payload),
      )
    })
  })

  describe('dashboardStats', () => {
    it('should publish correct payload to dashboard:stats channel', async () => {
      const payload = {
        userId: 'user-1',
        total: 10,
        pending: 3,
        inProgress: 2,
        completed: 5,
        cancelled: 0,
      }

      await eventBus.dashboardStats(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'dashboard:stats',
        JSON.stringify(payload),
      )
    })
  })

  describe('userInvalidate', () => {
    it('should publish correct payload to user:invalidate channel', async () => {
      const payload = { userId: 'user-1' }

      await eventBus.userInvalidate(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'user:invalidate',
        JSON.stringify(payload),
      )
    })
  })

  describe('accessChanged', () => {
    it('should publish correct payload to access:changed channel', async () => {
      const payload = { userId: 'user-1', newRole: 'ADMIN' }

      await eventBus.accessChanged(payload)

      expect(mockPublish).toHaveBeenCalledWith(
        'access:changed',
        JSON.stringify(payload),
      )
    })
  })

  describe('error handling', () => {
    it('should catch and log errors when publish fails (not throw)', async () => {
      mockPublish.mockRejectedValueOnce(new Error('Connection lost'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Must not throw — event publishing is best-effort
      await expect(
        eventBus.todoCreated({ userId: '1', todoId: '2', title: 'Test' }),
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
