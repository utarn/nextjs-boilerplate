// ---------------------------------------------------------------------------
// Redis Connection Utility
// ---------------------------------------------------------------------------
// Shared Redis connection configuration derived from REDIS_URL.
// Returns connection options that can be used by both BullMQ and ioredis
// directly, so the caller decides how to manage connection lifecycle.
// ---------------------------------------------------------------------------

/**
 * Redis connection options derived from REDIS_URL environment variable.
 * Compatible with both BullMQ (`connection` option) and `new Redis()`.
 */
export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const url = new URL(redisUrl)

  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
  }
}
