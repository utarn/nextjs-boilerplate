import type { Queue, Job } from 'bullmq'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueJobSummary {
  id: string | undefined
  queue: string
  status: string
  name: string
  attemptsMade: number
  maxAttempts: number
  timestamp: number | undefined
  processedOn: number | undefined
  finishedOn: number | undefined
  data: unknown
}

export interface QueueJobDetail extends QueueJobSummary {
  failedReason: string | undefined
  stacktrace: string[]
  progress: number | object | undefined
  returnvalue: unknown
}

export interface PaginatedJobs {
  jobs: QueueJobSummary[]
  total: number
  page: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Valid queue names
// ---------------------------------------------------------------------------

export const VALID_QUEUE_NAMES = [
  'todo-processing',
  'email-jobs',
  'export-jobs',
] as const

export type ValidQueueName = (typeof VALID_QUEUE_NAMES)[number]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function jobToSummary(job: Job, queueName: string): Promise<QueueJobSummary> {
  const state = await job.getState()
  return {
    id: job.id,
    queue: queueName,
    status: state,
    name: job.name,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts?.attempts ?? 0,
    timestamp: job.timestamp,
    processedOn: job.processedOn ?? undefined,
    finishedOn: job.finishedOn ?? undefined,
    data: truncateData(job.data),
  }
}

async function jobToDetail(job: Job, queueName: string): Promise<QueueJobDetail> {
  const summary = await jobToSummary(job, queueName)
  return {
    ...summary,
    data: job.data,
    failedReason: job.failedReason ?? undefined,
    stacktrace: job.stacktrace ?? [],
    progress: job.progress as number | object | undefined,
    returnvalue: job.returnvalue,
  }
}

/**
 * Truncate the data object to a string summary for list endpoints.
 */
function truncateData(data: unknown): unknown {
  if (data === null || data === undefined) return data
  const str = JSON.stringify(data)
  if (str.length > 200) {
    return str.slice(0, 200) + '...'
  }
  return data
}

// ---------------------------------------------------------------------------
// getQueueJobs — paginated job listing
// ---------------------------------------------------------------------------

export async function getQueueJobs(
  queue: Queue,
  status: string,
  page: number,
  limit: number,
): Promise<PaginatedJobs> {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)

  const start = (safePage - 1) * safeLimit
  const end = start + safeLimit - 1

  const statuses = [status as 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused' | 'prioritized']
  const jobs = await queue.getJobs(statuses, start, end)
  const counts = await queue.getJobCounts(status as 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused' | 'prioritized')
  const key = status as keyof typeof counts
  const total = counts[key] ?? 0

  const summaries = await Promise.all(jobs.map((j) => jobToSummary(j, queue.name)))

  return {
    jobs: summaries,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  }
}

// ---------------------------------------------------------------------------
// getQueueJob — full job detail
// ---------------------------------------------------------------------------

export async function getQueueJob(
  queue: Queue,
  jobId: string,
): Promise<QueueJobDetail> {
  const job = await queue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queue.name}`)
  }

  return jobToDetail(job, queue.name)
}

// ---------------------------------------------------------------------------
// retryQueueJob — retry a failed job
// ---------------------------------------------------------------------------

export async function retryQueueJob(
  queue: Queue,
  jobId: string,
): Promise<{ success: true }> {
  const job = await queue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queue.name}`)
  }

  const state = await job.getState()
  if (state !== 'failed') {
    throw new Error(`Job ${jobId} is not in failed state (current: ${state})`)
  }

  await job.retry()
  return { success: true }
}

// ---------------------------------------------------------------------------
// cancelQueueJob — remove a non-active job
// ---------------------------------------------------------------------------

export async function cancelQueueJob(
  queue: Queue,
  jobId: string,
): Promise<{ success: true }> {
  const job = await queue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queue.name}`)
  }

  const state = await job.getState()
  if (state === 'active') {
    throw new Error(`Cannot cancel active job ${jobId}`)
  }

  await job.remove()
  return { success: true }
}

// ---------------------------------------------------------------------------
// retryAllFailed — retry every failed job in the queue
// ---------------------------------------------------------------------------

export async function retryAllFailed(
  queue: Queue,
): Promise<{ retried: number }> {
  const failedJobs = await queue.getFailed()
  let retried = 0

  for (const job of failedJobs) {
    try {
      await job.retry()
      retried++
    } catch (err) {
      console.error(`Failed to retry job ${job.id}:`, err)
    }
  }

  return { retried }
}
