import { Worker } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'
import { TODO_PROCESSING_QUEUE, EMAIL_QUEUE, emailQueue, TodoProcessingJobData } from '@/lib/queue'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/event-bus'

// ---------------------------------------------------------------------------
// Todo Worker — processes todo-related background jobs
// ---------------------------------------------------------------------------

export function startTodoWorker() {
  const worker = new Worker(
    TODO_PROCESSING_QUEUE,
    async (job) => {
      const data = job.data as TodoProcessingJobData
      console.log(`[worker] Processing todo job ${job.id}: ${data.action} for todo ${data.todoId}`)

      switch (data.action) {
        case 'created':
          await handleTodoCreated(data.todoId)
          break
        case 'completed':
          await handleTodoCompleted(data.todoId)
          break
        case 'overdue':
          await handleOverdueTodos()
          break
      }

      return { success: true }
    },
    {
      connection: getRedisConnection(),
    },
  )

  worker.on('completed', (job) => {
    console.log(`[worker] Todo job ${job.id} completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker] Todo job ${job?.id} failed:`, err)
  })

  return worker
}

/**
 * Handle a todo that was created — publish updated dashboard stats.
 */
async function handleTodoCreated(todoId: string) {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { user: true },
  })

  if (!todo) return

  // Publish updated dashboard stats for the user
  await publishDashboardStats(todo.userId)
}

/**
 * Handle a todo that was completed — publish updated dashboard stats
 * and optionally notify the user.
 */
async function handleTodoCompleted(todoId: string) {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { user: true },
  })

  if (!todo?.user) return

  console.log(`[worker] Todo ${todoId} completed by ${todo.user.email}`)

  // Publish updated dashboard stats for the user
  await publishDashboardStats(todo.userId)
}

/**
 * Check for overdue todos and enqueue reminder emails for their owners.
 * Called by the "overdue" job, which can be scheduled via cron or triggered
 * manually from an admin endpoint.
 */
async function handleOverdueTodos() {
  const now = new Date()

  // Find all non-completed, non-cancelled todos past their due date
  const overdueTodos = await prisma.todo.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    include: {
      user: {
        select: { id: true, email: true, displayName: true },
      },
    },
  })

  if (overdueTodos.length === 0) {
    console.log('[worker] No overdue todos found')
    return
  }

  // Group overdue todos by user to send one email per user
  const userGroups = new Map<string, typeof overdueTodos>()

  for (const todo of overdueTodos) {
    if (!todo.user.email) continue
    const existing = userGroups.get(todo.user.id) || []
    existing.push(todo)
    userGroups.set(todo.user.id, existing)
  }

  console.log(
    `[worker] Found ${overdueTodos.length} overdue todos for ${userGroups.size} user(s)`,
  )

  // Enqueue one email per user with their overdue items
  for (const [userId, todos] of userGroups) {
    const user = todos[0].user
    const todoList = todos
      .map((t) => `• ${t.title}${t.dueDate ? ` (due: ${t.dueDate.toLocaleDateString()})` : ''}`)
      .join('\n')

    const overdueCount = todos.length
    const subject = `⏰ ${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''} on ${process.env.NEXT_PUBLIC_APP_NAME || 'Todo App'}`

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Overdue Todo${overdueCount > 1 ? 's' : ''}</h2>
        <p style="color: #555;">Hello ${user.displayName},</p>
        <p style="color: #555;">
          You have <strong>${overdueCount}</strong> overdue todo${overdueCount > 1 ? 's' : ''}:
        </p>
        <ul style="color: #333; line-height: 1.6;">
          ${todos.map((t) => `<li>${t.title}${t.dueDate ? ` <span style="color: #888;">(due: ${t.dueDate.toLocaleDateString()})</span>` : ''}</li>`).join('')}
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/todos"
             style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
            View My Todos
          </a>
        </p>
      </div>
    `

    await emailQueue.add('overdue-reminder', {
      to: user.email,
      subject,
      html,
    })

    console.log(`[worker] Enqueued overdue reminder for ${user.email} (${overdueCount} todos)`)
  }
}

/**
 * Compute and publish dashboard stats for a given user.
 */
async function publishDashboardStats(userId: string) {
  try {
    const stats = await prisma.todo.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    })

    const total = stats.reduce((sum, s) => sum + s._count.id, 0)
    const pending = stats.find((s) => s.status === 'PENDING')?._count.id ?? 0
    const inProgress = stats.find((s) => s.status === 'IN_PROGRESS')?._count.id ?? 0
    const completed = stats.find((s) => s.status === 'COMPLETED')?._count.id ?? 0
    const cancelled = stats.find((s) => s.status === 'CANCELLED')?._count.id ?? 0

    await eventBus.dashboardStats({
      userId,
      total,
      pending,
      inProgress,
      completed,
      cancelled,
    })
  } catch (err) {
    console.error('[worker] Failed to publish dashboard stats:', err)
  }
}
