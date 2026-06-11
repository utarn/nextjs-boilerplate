import Redis from 'ioredis'
import { getRedisConnection } from '@/lib/redis'

// ---------------------------------------------------------------------------
// Redis pub/sub event channels
// ---------------------------------------------------------------------------

export const CHANNEL_TODO_CREATED = 'todo:created'
export const CHANNEL_TODO_UPDATED = 'todo:updated'
export const CHANNEL_TODO_DELETED = 'todo:deleted'
export const CHANNEL_DASHBOARD_STATS = 'dashboard:stats'

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------

export interface TodoEventPayload {
  userId: string
  todoId: string
  title?: string
  status?: string
}

export interface DashboardStatsPayload {
  userId: string
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

// ---------------------------------------------------------------------------
// Publisher
// ---------------------------------------------------------------------------

let publisher: Redis | null = null

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(getRedisConnection())
  }
  return publisher
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const eventBus = {
  /**
   * Broadcast that a todo was created.
   */
  async todoCreated(data: TodoEventPayload): Promise<void> {
    await publish(CHANNEL_TODO_CREATED, data)
  },

  /**
   * Broadcast that a todo was updated.
   */
  async todoUpdated(data: TodoEventPayload): Promise<void> {
    await publish(CHANNEL_TODO_UPDATED, data)
  },

  /**
   * Broadcast that a todo was deleted.
   */
  async todoDeleted(data: TodoEventPayload): Promise<void> {
    await publish(CHANNEL_TODO_DELETED, data)
  },

  /**
   * Broadcast updated dashboard stats for a user.
   */
  async dashboardStats(data: DashboardStatsPayload): Promise<void> {
    await publish(CHANNEL_DASHBOARD_STATS, data)
  },
}

// ---------------------------------------------------------------------------
// Internal publish helper
// ---------------------------------------------------------------------------

/**
 * Publish a JSON payload to a Redis channel.
 * Errors are logged but not thrown — event publishing is best-effort and
 * must not block the request pipeline.
 */
async function publish(channel: string, payload: unknown): Promise<void> {
  try {
    const redis = getPublisher()
    await redis.publish(channel, JSON.stringify(payload))
  } catch (err) {
    console.error(
      `[event-bus] Failed to publish to ${channel}:`,
      err instanceof Error ? err.message : err,
    )
  }
}
