import Redis from 'ioredis'
import { getRedisConnection } from '@/lib/redis'
import {
  CHANNEL_TODO_CREATED,
  CHANNEL_TODO_UPDATED,
  CHANNEL_TODO_DELETED,
  CHANNEL_DASHBOARD_STATS,
  CHANNEL_USER_INVALIDATE,
  CHANNEL_ACCESS_CHANGED,
} from '@/lib/channel-types'

// Re-export payload types for consumers that currently import them from here.
export type {
  TodoCreatedPayload,
  TodoUpdatedPayload,
  TodoDeletedPayload,
  DashboardStatsPayload,
  UserInvalidatePayload,
  AccessChangedPayload,
} from '@/lib/channel-types'

// ---------------------------------------------------------------------------
// EventBus — typed Redis pub/sub publisher
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const eventBus = {
  /**
   * Broadcast that a todo was created.
   */
  async todoCreated(data: import('./channel-types').TodoCreatedPayload): Promise<void> {
    await publish(CHANNEL_TODO_CREATED, data)
  },

  /**
   * Broadcast that a todo was updated.
   */
  async todoUpdated(data: import('./channel-types').TodoUpdatedPayload): Promise<void> {
    await publish(CHANNEL_TODO_UPDATED, data)
  },

  /**
   * Broadcast that a todo was deleted.
   */
  async todoDeleted(data: import('./channel-types').TodoDeletedPayload): Promise<void> {
    await publish(CHANNEL_TODO_DELETED, data)
  },

  /**
   * Broadcast updated dashboard stats for a user.
   */
  async dashboardStats(data: import('./channel-types').DashboardStatsPayload): Promise<void> {
    await publish(CHANNEL_DASHBOARD_STATS, data)
  },

  /**
   * Broadcast that a user should be invalidated (force-disconnected).
   */
  async userInvalidate(data: import('./channel-types').UserInvalidatePayload): Promise<void> {
    await publish(CHANNEL_USER_INVALIDATE, data)
  },

  /**
   * Broadcast that a user's access changed (role update).
   */
  async accessChanged(data: import('./channel-types').AccessChangedPayload): Promise<void> {
    await publish(CHANNEL_ACCESS_CHANGED, data)
  },
}
