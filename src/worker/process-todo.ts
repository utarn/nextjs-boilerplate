import { Worker } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'
import { TODO_PROCESSING_QUEUE, emailQueue, TodoProcessingJobData, EmailJobData } from '@/lib/queue'
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

  // Enqueue one branded email per user with their overdue items
  for (const [, todos] of userGroups) {
    const user = todos[0].user
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Next.js Boilerplate'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const overdueCount = todos.length

    const todoRows = todos
      .map((t) => {
        const dueLabel = t.dueDate
          ? ` (due: ${t.dueDate.toLocaleDateString()})`
          : ''
        return `<tr><td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0; color: #333333;">• ${t.title}${dueLabel}</td></tr>`
      })
      .join('')

    const bodyHtml = `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #dc2626;">
        Overdue Todo${overdueCount > 1 ? 's' : ''}
      </h2>
      <p style="margin: 0 0 8px 0; color: #555555;">
        Hello ${user.displayName},
      </p>
      <p style="margin: 0 0 16px 0; color: #555555;">
        You have <strong>${overdueCount}</strong> overdue todo${overdueCount > 1 ? 's' : ''}:
      </p>
      <table style="margin: 12px 0; font-size: 14px;">
        ${todoRows}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td align="center" style="border-radius: 6px; background-color: #2563eb;">
            <a
              href="${appUrl}/todos"
              style="
                display: inline-block;
                padding: 12px 28px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                font-size: 15px;
                font-weight: 600;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                line-height: 1;
              "
            >
              View My Todos
            </a>
          </td>
        </tr>
      </table>
    `

    const todoListText = todos
      .map((t) => {
        const dueLabel = t.dueDate
          ? ` (due: ${t.dueDate.toLocaleDateString()})`
          : ''
        return `- ${t.title}${dueLabel}`
      })
      .join('\n')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Overdue Todo${overdueCount > 1 ? 's' : ''}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1a1a1a;">
                ${appName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; border-top: 1px solid #e8e8e8;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #999999;">
                ${appName} &mdash; Your productivity platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const text =
      `Hello ${user.displayName},\n\n` +
      `You have ${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''}:\n\n` +
      `${todoListText}\n\n` +
      `View My Todos: ${appUrl}/todos`

    const subject = `${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''} on ${appName}`

    await emailQueue.add('overdue-reminder', {
      type: 'overdue-reminder',
      to: user.email,
      subject,
      html,
      text,
    } as EmailJobData)

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
