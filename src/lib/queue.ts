import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

// ---------------------------------------------------------------------------
// BullMQ Queue Configuration
// ---------------------------------------------------------------------------

export const TODO_PROCESSING_QUEUE = 'todo-processing'
export const EMAIL_QUEUE = 'email-jobs'
export const EXPORT_QUEUE = 'export-jobs'

// Re-export getRedisConnection for backward compatibility with existing
// consumers (worker files, tests) that import it from this module.
export { getRedisConnection }

/**
 * Shared BullMQ queue instance for todo background processing.
 *
 * @example
 * ```ts
 * // Enqueue a todo processing job
 * import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'
 *
 * await todoProcessingQueue.add('todo-created', {
 *   todoId: '123',
 *   action: 'created',
 * } as TodoProcessingJobData)
 *
 * // Enqueue with custom options
 * await todoProcessingQueue.add('todo-created', data, {
 *   delay: 5000,       // wait 5 seconds
 *   priority: 1,       // higher priority
 * })
 * ```
 */
export const todoProcessingQueue = new Queue(TODO_PROCESSING_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
})

/**
 * BullMQ queue instance for email jobs.
 * Uses 3 retry attempts with exponential backoff for reliability.
 *
 * @example
 * ```ts
 * // Enqueue an email job (typically from a worker or API route)
 * import { emailQueue, EmailJobData } from '@/lib/queue'
 *
 * await emailQueue.add('overdue-reminder', {
 *   type: 'overdue-reminder',
 *   to: 'user@example.com',
 *   subject: 'You have overdue todos',
 *   html: '<p>Your todos are overdue</p>',
 *   text: 'Your todos are overdue',
 * } as EmailJobData)
 * ```
 */
export const emailQueue = new Queue(EMAIL_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
})

/**
 * BullMQ queue instance for background export jobs.
 * Uses 1 retry attempt (export is idempotent but expensive).
 */
export const exportQueue = new Queue(EXPORT_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
})

/**
 * Shape of a todo processing job.
 */
export interface TodoProcessingJobData {
  todoId: string
  action: 'created' | 'updated' | 'completed' | 'overdue'
}

/**
 * Shape of an email job.
 * `type` is informational / for observability — the worker always sends
 * whatever html/text the caller provides.
 */
export interface EmailJobData {
  type:
    | 'new-user-notification'
    | 'account-approved'
    | 'account-rejected'
    | 'quota-warning'
    | 'overdue-reminder'
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Shape of an export job.
 */
export interface ExportJobData {
  exportId: string
  userId: string
}
