import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock BullMQ Worker to capture the processor function without connecting to Redis
const mockWorkerOn = vi.fn()
vi.mock('bullmq', () => ({
  Worker: vi.fn(function (_queueName: string, processor: any, _opts: any) {
    mockWorkerProcessor = processor
    return { on: mockWorkerOn }
  }),
}))

let mockWorkerProcessor: any

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

// Mock event bus
vi.mock('@/lib/event-bus', () => ({
  eventBus: {
    dashboardStats: vi.fn(),
  },
}))

// Mock queue module (provides emailQueue.add, TODO_PROCESSING_QUEUE, getRedisConnection)
vi.mock('@/lib/queue', () => ({
  TODO_PROCESSING_QUEUE: 'todo-processing',
  EMAIL_QUEUE: 'email-jobs',
  emailQueue: {
    add: vi.fn(),
  },
  getRedisConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}))

// Mock redis module (process-todo imports getRedisConnection from here)
vi.mock('@/lib/redis', () => ({
  getRedisConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}))

import { startTodoWorker } from '@/worker/process-todo'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/event-bus'
import { emailQueue, TODO_PROCESSING_QUEUE } from '@/lib/queue'
import { Worker } from 'bullmq'

describe('process-todo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkerProcessor = undefined
  })

  describe('startTodoWorker', () => {
    it('creates a BullMQ Worker with the correct queue name', () => {
      const worker = startTodoWorker()

      expect(Worker).toHaveBeenCalledTimes(1)
      expect(Worker).toHaveBeenCalledWith(
        TODO_PROCESSING_QUEUE,
        expect.any(Function),
        expect.objectContaining({ connection: expect.any(Object) }),
      )
      expect(worker.on).toBe(mockWorkerOn)
    })

    it('handles created action: finds todo and publishes dashboard stats', async () => {
      startTodoWorker()

      const mockTodo = {
        id: 'todo-1',
        userId: 'user-1',
        title: 'Test Todo',
        status: 'PENDING',
        user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User' },
      }
      const mockStats = [
        { status: 'PENDING', _count: { id: 3 } },
        { status: 'IN_PROGRESS', _count: { id: 1 } },
        { status: 'COMPLETED', _count: { id: 5 } },
        { status: 'CANCELLED', _count: { id: 0 } },
      ]

      prisma.todo.findUnique.mockResolvedValue(mockTodo)
      prisma.todo.groupBy.mockResolvedValue(mockStats)

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: 'todo-1', action: 'created' },
      })

      expect(result).toEqual({ success: true })
      expect(prisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: 'todo-1' },
        include: { user: true },
      })
      expect(prisma.todo.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { userId: 'user-1' },
        _count: { id: true },
      })
      expect(eventBus.dashboardStats).toHaveBeenCalledWith({
        userId: 'user-1',
        total: 9,
        pending: 3,
        inProgress: 1,
        completed: 5,
        cancelled: 0,
      })
    })

    it('handles created action when todo is not found (returns without publishing)', async () => {
      startTodoWorker()
      prisma.todo.findUnique.mockResolvedValue(null)

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: 'non-existent', action: 'created' },
      })

      expect(result).toEqual({ success: true })
      expect(eventBus.dashboardStats).not.toHaveBeenCalled()
    })

    it('handles completed action: finds todo with user and publishes stats', async () => {
      startTodoWorker()

      const mockTodo = {
        id: 'todo-1',
        userId: 'user-1',
        title: 'Completed Todo',
        status: 'COMPLETED',
        user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
      }
      prisma.todo.findUnique.mockResolvedValue(mockTodo)
      prisma.todo.groupBy.mockResolvedValue([])

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: 'todo-1', action: 'completed' },
      })

      expect(result).toEqual({ success: true })
      expect(prisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: 'todo-1' },
        include: { user: true },
      })
      expect(prisma.todo.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { userId: 'user-1' },
        _count: { id: true },
      })
      expect(eventBus.dashboardStats).toHaveBeenCalledWith({
        userId: 'user-1',
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      })
    })

    it('handles completed action when todo has no user (returns without publishing)', async () => {
      startTodoWorker()
      prisma.todo.findUnique.mockResolvedValue(null)

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: 'todo-1', action: 'completed' },
      })

      expect(result).toEqual({ success: true })
      expect(eventBus.dashboardStats).not.toHaveBeenCalled()
    })

    it('handles overdue action: groups by user and enqueues email reminders', async () => {
      startTodoWorker()

      const mockOverdueTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          title: 'Overdue 1',
          status: 'PENDING',
          dueDate: new Date('2023-01-01'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            displayName: 'User One',
          },
        },
        {
          id: 'todo-2',
          userId: 'user-1',
          title: 'Overdue 2',
          status: 'IN_PROGRESS',
          dueDate: new Date('2023-01-02'),
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            displayName: 'User One',
          },
        },
      ]

      prisma.todo.findMany.mockResolvedValue(mockOverdueTodos)

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: '', action: 'overdue' },
      })

      expect(result).toEqual({ success: true })
      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          }),
        }),
      )
      expect(emailQueue.add).toHaveBeenCalledTimes(1)
      expect(emailQueue.add).toHaveBeenCalledWith(
        'overdue-reminder',
        expect.objectContaining({
          type: 'overdue-reminder',
          to: 'user1@example.com',
          subject: '2 overdue todos on Next.js Boilerplate',
        }),
      )
    })

    it('handles overdue action with no overdue todos (logs and returns without emails)', async () => {
      startTodoWorker()
      prisma.todo.findMany.mockResolvedValue([])

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: { todoId: '', action: 'overdue' },
      })

      expect(result).toEqual({ success: true })
      expect(consoleLogSpy).toHaveBeenCalledWith('[worker] No overdue todos found')
      expect(emailQueue.add).not.toHaveBeenCalled()

      consoleLogSpy.mockRestore()
    })

    it('logs success message on completed event', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      startTodoWorker()

      const completedHandler = mockWorkerOn.mock.calls.find(
        ([event]: [string]) => event === 'completed',
      )?.[1]

      completedHandler({ id: 'job-1' })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[worker] Todo job job-1 completed successfully',
      )
      consoleLogSpy.mockRestore()
    })

    it('logs error message on failed event', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      startTodoWorker()

      const failedHandler = mockWorkerOn.mock.calls.find(
        ([event]: [string]) => event === 'failed',
      )?.[1]

      failedHandler({ id: 'job-1' }, new Error('Something went wrong'))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[worker] Todo job job-1 failed:',
        expect.any(Error),
      )
      consoleErrorSpy.mockRestore()
    })
  })
})
