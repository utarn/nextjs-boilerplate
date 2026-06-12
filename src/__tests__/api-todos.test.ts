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
  TodoStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  TodoPriority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' },
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
    appUrl: vi.fn((path: string) => new URL(path, 'http://localhost:3000')),
  }
})

vi.mock('@/lib/prisma', () => {
  const mockTodo = {
    id: 'todo-1',
    userId: 'user-1',
    title: 'Test todo',
    description: null,
    priority: 'MEDIUM',
    status: 'PENDING',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    dueDate: null,
    completedAt: null,
    attachmentPath: null,
    attachmentName: null,
    attachmentSize: null,
  }
  return {
    prisma: {
      todo: {
        findMany: vi.fn().mockResolvedValue([mockTodo]),
        findFirst: vi.fn().mockResolvedValue(mockTodo),
        create: vi.fn().mockResolvedValue(mockTodo),
        update: vi.fn().mockResolvedValue(mockTodo),
        delete: vi.fn().mockResolvedValue(mockTodo),
      },
      webUser: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }),
        update: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    },
  }
})

vi.mock('@/lib/queue', () => ({
  todoProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    name: 'todo-processing',
    getJobCounts: vi.fn(),
  },
  emailQueue: { name: 'email-jobs', getJobCounts: vi.fn() },
  exportQueue: { name: 'export-jobs', getJobCounts: vi.fn() },
  TODO_PROCESSING_QUEUE: 'todo-processing',
  EMAIL_QUEUE: 'email-jobs',
  EXPORT_QUEUE: 'export-jobs',
}))

vi.mock('@/lib/event-bus', () => ({
  eventBus: {
    todoCreated: vi.fn().mockResolvedValue(undefined),
    todoUpdated: vi.fn().mockResolvedValue(undefined),
    todoDeleted: vi.fn().mockResolvedValue(undefined),
    dashboardStats: vi.fn().mockResolvedValue(undefined),
    userInvalidate: vi.fn().mockResolvedValue(undefined),
    accessChanged: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    TODO_CREATED: 'todo.created',
    TODO_UPDATED: 'todo.updated',
    TODO_DELETED: 'todo.deleted',
    TODO_COMPLETED: 'todo.completed',
    EXPORT_CREATED: 'export.created',
    EXPORT_COMPLETED: 'export.completed',
    ADMIN_ACTION: 'admin.action',
  },
}))

vi.mock('@/lib/quota', () => ({
  enforceUserQuota: vi.fn().mockResolvedValue(undefined),
  checkUserQuota: vi
    .fn()
    .mockResolvedValue({ allowed: true, used: 0, limit: 1000, remaining: 1000 }),
  getStorageUsage: vi
    .fn()
    .mockResolvedValue({ usedBytes: BigInt(0), quotaBytes: BigInt(1048576000) }),
}))

vi.mock('@/lib/storage', () => ({
  getStorageAdapter: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue('uploaded-path'),
    delete: vi.fn().mockResolvedValue(undefined),
    download: vi.fn(),
    getUrl: vi.fn(),
    exists: vi.fn(),
  })),
}))

vi.mock('@/lib/email', () => ({
  sendQuotaWarningEmail: vi.fn().mockResolvedValue(undefined),
  sendNewUserNotificationToAdmins: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/event-bus'
import { logAuditEvent } from '@/lib/audit'
import { enforceUserQuota, checkUserQuota, getStorageUsage } from '@/lib/quota'
import { getStorageAdapter } from '@/lib/storage'
import { todoProcessingQueue } from '@/lib/queue'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api/todos', () => {
  let GET: (req: NextRequest) => Promise<NextResponse>
  let POST: (req: NextRequest) => Promise<NextResponse>
  let PATCH: (
    req: NextRequest,
    ctx: { params: Promise<{ todoId: string }> },
  ) => Promise<NextResponse>
  let DELETE: (
    req: NextRequest,
    ctx: { params: Promise<{ todoId: string }> },
  ) => Promise<NextResponse>

  beforeEach(async () => {
    vi.clearAllMocks()
    const todosModule = await import('@/app/api/todos/route')
    const todoIdModule = await import('@/app/api/todos/[todoId]/route')
    GET = todosModule.GET
    POST = todosModule.POST
    PATCH = todoIdModule.PATCH
    DELETE = todoIdModule.DELETE
  })

  // -----------------------------------------------------------------------
  // GET /api/todos
  // -----------------------------------------------------------------------

  describe('GET /api/todos', () => {
    it('returns todos for authenticated user', async () => {
      const mockTodos = [
        { id: '1', title: 'Todo 1', userId: 'user-1' },
        { id: '2', title: 'Todo 2', userId: 'user-1' },
      ]
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockTodos)

      const req = new NextRequest('http://localhost:3000/api/todos')
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveLength(2)
      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  // -----------------------------------------------------------------------
  // POST /api/todos
  // -----------------------------------------------------------------------

  describe('POST /api/todos', () => {
    it('creates a todo and returns 201', async () => {
      const createdTodo = {
        id: 'new-1',
        userId: 'user-1',
        title: 'New todo',
        description: null,
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: null,
        attachmentName: null,
        attachmentSize: null,
      }
      ;(prisma.todo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdTodo)

      const req = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'New todo', priority: 'HIGH' }),
      })

      const response = await POST(req)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.title).toBe('New todo')
      expect(prisma.todo.create).toHaveBeenCalled()
      expect(todoProcessingQueue.add).toHaveBeenCalledWith('todo-created', {
        todoId: 'new-1',
        action: 'created',
      })
      expect(eventBus.todoCreated).toHaveBeenCalledWith({
        userId: 'user-1',
        todoId: 'new-1',
        title: 'New todo',
      })
      expect(logAuditEvent).toHaveBeenCalled()
    })

    it('returns 400 when title is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priority: 'HIGH' }),
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Title is required')
    })

    it('returns 400 with invalid priority', async () => {
      const req = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Test', priority: 'INVALID' }),
      })

      const response = await POST(req)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid priority value')
    })

    it('POST with file upload calls storage adapter and enforces quota', async () => {
      // Mock storage adapter
      const mockStorage = {
        upload: vi.fn().mockResolvedValue('todos/user-1/abc123_test.txt'),
        delete: vi.fn(),
        download: vi.fn(),
        getUrl: vi.fn(),
        exists: vi.fn(),
      }
      ;(getStorageAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockStorage)

      // Mock the created todo with attachment fields
      const createdWithAttachment = {
        id: 'todo-file-1',
        userId: 'user-1',
        title: 'Test with attachment',
        description: null,
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: 'todos/user-1/abc123_test.txt',
        attachmentName: 'test.txt',
        attachmentSize: 1024,
      }
      ;(prisma.todo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        createdWithAttachment,
      )

      // Build request with FormData body (triggers multipart automatically)
      const formData = new FormData()
      formData.append('title', 'Test with attachment')
      formData.append('priority', 'HIGH')
      const mockFile = new File(['file content'], 'test.txt', { type: 'text/plain' })
      formData.append('attachment', mockFile)

      const req = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(req)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.attachmentPath).toBeTruthy()
      expect(enforceUserQuota).toHaveBeenCalledWith('user-1', 'files')
      expect(checkUserQuota).toHaveBeenCalledWith('user-1', 'storage')
      expect(mockStorage.upload).toHaveBeenCalled()
      expect(prisma.webUser.update).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // PATCH /api/todos/[todoId]
  // -----------------------------------------------------------------------

  describe('PATCH /api/todos/[todoId]', () => {
    it('updates a todo', async () => {
      ;(prisma.todo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'todo-1',
        userId: 'user-1',
        title: 'Original title',
        description: null,
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: null,
        attachmentName: null,
        attachmentSize: null,
      })
      const updatedTodo = {
        id: 'todo-1',
        userId: 'user-1',
        title: 'Updated title',
        description: null,
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: null,
        attachmentName: null,
        attachmentSize: null,
      }
      ;(prisma.todo.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedTodo)

      const req = new NextRequest(`http://localhost:3000/api/todos/todo-1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title', priority: 'HIGH' }),
      })

      const response = await PATCH(req, { params: Promise.resolve({ todoId: 'todo-1' }) })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.title).toBe('Updated title')
      expect(prisma.todo.update).toHaveBeenCalled()
      expect(eventBus.todoUpdated).toHaveBeenCalled()
      expect(logAuditEvent).toHaveBeenCalled()
    })

    it('returns 404 for non-existent todo', async () => {
      ;(prisma.todo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost:3000/api/todos/todo-999`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })

      const response = await PATCH(req, { params: Promise.resolve({ todoId: 'todo-999' }) })
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Todo not found')
    })

    it('returns 400 for invalid status', async () => {
      ;(prisma.todo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'todo-1',
        userId: 'user-1',
        title: 'Original title',
        description: null,
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: null,
        attachmentName: null,
        attachmentSize: null,
      })

      const req = new NextRequest(`http://localhost:3000/api/todos/todo-1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      })

      const response = await PATCH(req, { params: Promise.resolve({ todoId: 'todo-1' }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid status value')
    })
  })

  // -----------------------------------------------------------------------
  // DELETE /api/todos/[todoId]
  // -----------------------------------------------------------------------

  describe('DELETE /api/todos/[todoId]', () => {
    it('deletes a todo', async () => {
      ;(prisma.todo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'todo-1',
        userId: 'user-1',
        title: 'Todo to delete',
        description: null,
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null,
        completedAt: null,
        attachmentPath: null,
        attachmentName: null,
        attachmentSize: null,
      })
      ;(prisma.todo.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'todo-1',
      })

      const req = new NextRequest(`http://localhost:3000/api/todos/todo-1`, {
        method: 'DELETE',
      })

      const response = await DELETE(req, { params: Promise.resolve({ todoId: 'todo-1' }) })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(prisma.todo.delete).toHaveBeenCalledWith({ where: { id: 'todo-1' } })
      expect(eventBus.todoDeleted).toHaveBeenCalledWith({
        userId: 'user-1',
        todoId: 'todo-1',
      })
      expect(logAuditEvent).toHaveBeenCalled()
    })

    it('returns 404 for non-existent todo', async () => {
      ;(prisma.todo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost:3000/api/todos/todo-999`, {
        method: 'DELETE',
      })

      const response = await DELETE(req, { params: Promise.resolve({ todoId: 'todo-999' }) })
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Todo not found')
    })
  })
})
