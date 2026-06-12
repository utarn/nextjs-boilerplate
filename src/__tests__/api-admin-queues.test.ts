import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock admin user
// ---------------------------------------------------------------------------
const mockAdmin = {
  userId: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin User',
  role: 'ADMIN' as const,
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
    withAuth: vi.fn((_req: NextRequest, handler: (user: typeof mockAdmin) => unknown) =>
      handler(mockAdmin),
    ),
    withRoles: vi.fn(
      (
        _req: NextRequest,
        _roles: string[],
        handler: (user: typeof mockAdmin) => unknown,
      ) => handler(mockAdmin),
    ),
    AuthenticationError: MockAuthenticationError,
    AuthorizationError: MockAuthorizationError,
    appUrl: vi.fn((path: string) => new URL(path, 'http://localhost:3000')),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webUser: {
      findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', status: 'ACTIVE' }),
    },
  },
}))

vi.mock('@/lib/queue', () => ({
  todoProcessingQueue: {
    getJobCounts: vi.fn(),
    getJob: vi.fn(),
    name: 'todo-processing',
    add: vi.fn(),
  },
  emailQueue: {
    getJobCounts: vi.fn(),
    getJob: vi.fn(),
    name: 'email-jobs',
    add: vi.fn(),
  },
  exportQueue: {
    getJobCounts: vi.fn(),
    getJob: vi.fn(),
    name: 'export-jobs',
    add: vi.fn(),
  },
  TODO_PROCESSING_QUEUE: 'todo-processing',
  EMAIL_QUEUE: 'email-jobs',
  EXPORT_QUEUE: 'export-jobs',
}))

vi.mock('@/lib/queue-management', () => ({
  getQueueJobs: vi.fn(),
  cancelQueueJob: vi.fn(),
  retryQueueJob: vi.fn(),
  retryAllFailed: vi.fn(),
  getQueueJob: vi.fn(),
  VALID_QUEUE_NAMES: ['todo-processing', 'email-jobs', 'export-jobs'],
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    ADMIN_ACTION: 'admin.action',
    TODO_CREATED: 'todo.created',
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { withRoles } from '@/lib/auth'
import { todoProcessingQueue, emailQueue, exportQueue } from '@/lib/queue'
import { getQueueJobs, cancelQueueJob, retryQueueJob } from '@/lib/queue-management'
import { logAuditEvent } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api/admin/queues', () => {
  let GET: (req: NextRequest) => Promise<NextResponse>
  let cancelPOST: (
    req: NextRequest,
    ctx: { params: Promise<{ jobId: string }> },
  ) => Promise<NextResponse>
  let retryPOST: (
    req: NextRequest,
    ctx: { params: Promise<{ jobId: string }> },
  ) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    GET = (await import('@/app/api/admin/queues/route')).GET
    cancelPOST = (await import('@/app/api/admin/queues/[jobId]/cancel/route')).POST
    retryPOST = (await import('@/app/api/admin/queues/[jobId]/retry/route')).POST
  })

  // -----------------------------------------------------------------------
  // GET /api/admin/queues
  // -----------------------------------------------------------------------

  describe('GET /api/admin/queues', () => {
    it('returns job counts for all queues', async () => {
      ;(todoProcessingQueue.getJobCounts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
      })
      ;(emailQueue.getJobCounts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        waiting: 0,
        active: 0,
        completed: 50,
        failed: 1,
        delayed: 0,
      })
      ;(exportQueue.getJobCounts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        waiting: 1,
        active: 0,
        completed: 10,
        failed: 0,
        delayed: 0,
      })

      const req = new NextRequest('http://localhost:3000/api/admin/queues')
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.queues).toBeDefined()
      expect(data.queues['todo-processing']).toBeDefined()
      expect(data.queues['email-jobs']).toBeDefined()
      expect(data.queues['export-jobs']).toBeDefined()
      expect(data.queues['todo-processing'].waiting).toBe(5)
      expect(data.queues['todo-processing'].failed).toBe(3)
      expect(todoProcessingQueue.getJobCounts).toHaveBeenCalled()
      expect(emailQueue.getJobCounts).toHaveBeenCalled()
      expect(exportQueue.getJobCounts).toHaveBeenCalled()
    })

    it('returns paginated failed jobs for a specific queue', async () => {
      ;(getQueueJobs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        jobs: [
          {
            id: 'job-1',
            queue: 'todo-processing',
            status: 'failed',
            name: 'todo-created',
            attemptsMade: 3,
            maxAttempts: 5,
            timestamp: 1700000000000,
            processedOn: 1700000001000,
            finishedOn: 1700000002000,
            data: { todoId: '123' },
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      })

      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues?queue=todo-processing&status=failed&page=1&limit=20',
      )
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.jobs).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(getQueueJobs).toHaveBeenCalledWith(
        todoProcessingQueue,
        'failed',
        1,
        20,
      )
    })

    it('returns 400 for invalid queue name', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues?queue=invalid',
      )
      const response = await GET(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid queue')
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/queues/[jobId]/cancel
  // -----------------------------------------------------------------------

  describe('POST /api/admin/queues/[jobId]/cancel', () => {
    it('cancels a job', async () => {
      ;(cancelQueueJob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true })

      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-123/cancel?queue=todo-processing',
        { method: 'POST' },
      )
      const response = await cancelPOST(req, {
        params: Promise.resolve({ jobId: 'job-123' }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(cancelQueueJob).toHaveBeenCalledWith(todoProcessingQueue, 'job-123')
      expect(logAuditEvent).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'admin.action',
        entityType: 'bullmq-job',
        entityId: 'job-123',
        details: { action: 'cancel', queue: 'todo-processing' },
      })
    })

    it('returns 400 without queue param', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-123/cancel',
        { method: 'POST' },
      )
      const response = await cancelPOST(req, {
        params: Promise.resolve({ jobId: 'job-123' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid queue param required')
    })

    it('returns 400 with invalid queue param', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-123/cancel?queue=invalid-queue',
        { method: 'POST' },
      )
      const response = await cancelPOST(req, {
        params: Promise.resolve({ jobId: 'job-123' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid queue param required')
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/admin/queues/[jobId]/retry
  // -----------------------------------------------------------------------

  describe('POST /api/admin/queues/[jobId]/retry', () => {
    it('retries a job', async () => {
      ;(retryQueueJob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true })

      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-456/retry?queue=email-jobs',
        { method: 'POST' },
      )
      const response = await retryPOST(req, {
        params: Promise.resolve({ jobId: 'job-456' }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(retryQueueJob).toHaveBeenCalledWith(emailQueue, 'job-456')
      expect(logAuditEvent).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'admin.action',
        entityType: 'bullmq-job',
        entityId: 'job-456',
        details: { action: 'retry', queue: 'email-jobs' },
      })
    })

    it('returns 400 without queue param', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-456/retry',
        { method: 'POST' },
      )
      const response = await retryPOST(req, {
        params: Promise.resolve({ jobId: 'job-456' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid queue param required')
    })

    it('returns 400 with invalid queue param', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/queues/job-456/retry?queue=invalid',
        { method: 'POST' },
      )
      const response = await retryPOST(req, {
        params: Promise.resolve({ jobId: 'job-456' }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid queue param required')
    })
  })
})
