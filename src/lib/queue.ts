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
