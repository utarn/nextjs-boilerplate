import { parse } from 'cookie'
import { Server as SocketIOServer, Socket } from 'socket.io'
import Redis from 'ioredis'
import type { Server as HTTPServer } from 'http'

import { verifyToken, type JWTPayload } from '@/lib/auth'
import { getRedisConnection } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@/generated/client'
import {
  CHANNEL_TODO_CREATED,
  CHANNEL_TODO_UPDATED,
  CHANNEL_TODO_DELETED,
  CHANNEL_DASHBOARD_STATS,
  CHANNEL_USER_INVALIDATE,
  CHANNEL_ACCESS_CHANGED,
  type TodoCreatedPayload,
  type TodoUpdatedPayload,
  type TodoDeletedPayload,
  type DashboardStatsPayload,
  type UserInvalidatePayload,
  type AccessChangedPayload,
} from '@/lib/channel-types'

// ---------------------------------------------------------------------------
// Socket.IO Server — auth handshake + Redis bridge
// ---------------------------------------------------------------------------
// Creates a Socket.IO server attached to the app's HTTP server.
// Authenticates every connection via the `auth_token` cookie + JWT verification
// + DB status check. Subscribes to Redis pub/sub channels and forwards
// events to the appropriate Socket.IO rooms (user-specific).
// Supports user invalidation (force-disconnect) and access-change
// resubscription (recomputation of socket rooms without disconnection).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'auth_token'

const ADMIN_ROOM = 'admin:room'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the auth_token cookie value from the raw cookie header string.
 */
export function extractAuthToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const cookies = parse(cookieHeader)
  return cookies[COOKIE_NAME] || null
}

/**
 * Determine which supplementary rooms a user should be joined to based on
 * their role. Every authenticated user is always in their `user:userId` room;
 * this returns additional role-based rooms.
 */
function getRoleRooms(role: string): string[] {
  const rooms: string[] = []
  if (role === 'ADMIN') {
    rooms.push(ADMIN_ROOM)
  }
  return rooms
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let io: SocketIOServer | null = null
let subscriber: Redis | null = null

// ---------------------------------------------------------------------------
// Socket.IO server factory
// ---------------------------------------------------------------------------

/**
 * Initialise Socket.IO on the given HTTP server.
 *
 * - Registers a middleware that authenticates via `auth_token` cookie.
 * - On successful connect, joins a user-specific room for targeted events
 *   and role-based rooms for role-targeted broadcasts.
 * - Subscribes to Redis channels and bridges events to Socket.IO rooms.
 * - Handles `user:invalidate` events by force-disconnecting matching sockets.
 * - Handles `access:changed` events by recomputing room subscriptions
 *   without disconnecting the user.
 *
 * Returns the Socket.IO server instance.
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    serveClient: false,
    cors: { origin: '*' },
    path: '/socket.io/',
  })

  // -------------------------------------------------------------------------
  // Auth middleware — runs on every new connection
  // -------------------------------------------------------------------------
  io.use(async (socket: Socket, next) => {
    try {
      const token = extractAuthToken(socket.request.headers.cookie)

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const payload: JWTPayload | null = verifyToken(token)
      if (!payload) {
        return next(new Error('Invalid token'))
      }

      // Verify user still has ACTIVE status in database
      const dbUser = await prisma.webUser.findUnique({
        where: { id: payload.userId },
        select: { status: true },
      })

      if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
        return next(new Error('Account is not active'))
      }

      // Attach user info to socket for later use
      socket.data.user = payload

      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  // -------------------------------------------------------------------------
  // Connection handler
  // -------------------------------------------------------------------------
  io.on('connection', async (socket: Socket) => {
    const user: JWTPayload = socket.data.user

    // Join a user-specific room for targeted events
    socket.join(`user:${user.userId}`)

    // Join role-based rooms (e.g. admin:room for ADMIN users)
    for (const room of getRoleRooms(user.role)) {
      socket.join(room)
    }

    console.log(`[socket] User ${user.email} connected`)

    socket.on('disconnect', (reason) => {
      console.log(`[socket] User ${user.email} disconnected: ${reason}`)
    })
  })

  // -------------------------------------------------------------------------
  // Redis subscriber — bridge pub/sub events to Socket.IO
  // -------------------------------------------------------------------------
  subscriber = new Redis(getRedisConnection())

  subscriber.subscribe(
    CHANNEL_TODO_CREATED,
    CHANNEL_TODO_UPDATED,
    CHANNEL_TODO_DELETED,
    CHANNEL_DASHBOARD_STATS,
    CHANNEL_USER_INVALIDATE,
    CHANNEL_ACCESS_CHANGED,
  )

  subscriber.on('message', async (channel: string, message: string) => {
    try {
      const payload = JSON.parse(message)

      switch (channel) {
        case CHANNEL_TODO_CREATED: {
          const { userId, todoId, title } = payload as TodoCreatedPayload
          io?.to(`user:${userId}`).emit('todo:created', { todoId, title })
          break
        }

        case CHANNEL_TODO_UPDATED: {
          const { userId, todoId, status } = payload as TodoUpdatedPayload
          io?.to(`user:${userId}`).emit('todo:updated', { todoId, status })
          break
        }

        case CHANNEL_TODO_DELETED: {
          const { userId, todoId } = payload as TodoDeletedPayload
          io?.to(`user:${userId}`).emit('todo:deleted', { todoId })
          break
        }

        case CHANNEL_DASHBOARD_STATS: {
          const statsPayload = payload as DashboardStatsPayload
          io?.to(`user:${statsPayload.userId}`).emit('dashboard:stats', statsPayload)
          break
        }

        case CHANNEL_USER_INVALIDATE: {
          // Force-disconnect all sockets belonging to the invalidated user
          const { userId } = payload as UserInvalidatePayload
          const userRoom = `user:${userId}`
          io?.to(userRoom).disconnectSockets(true)
          console.log(`[socket] Invalidated user ${userId} — disconnected all sockets`)
          break
        }

        case CHANNEL_ACCESS_CHANGED: {
          // Recompute room subscriptions for the affected user's sockets
          // without disconnecting them
          const { userId, newRole } = payload as AccessChangedPayload
          const userRoom = `user:${userId}`
          const sockets = await io?.in(userRoom).fetchSockets()

          if (sockets && sockets.length > 0) {
            const newRoleRooms = getRoleRooms(newRole)

            for (const socket of sockets) {
              // Determine current rooms (excluding socket.id default and user room)
              const currentRooms = new Set(socket.rooms)
              currentRooms.delete(socket.id)
              currentRooms.delete(userRoom)

              // Leave rooms that are no longer accessible
              for (const room of currentRooms) {
                if (!newRoleRooms.includes(room)) {
                  socket.leave(room)
                }
              }

              // Join rooms that are newly accessible
              for (const room of newRoleRooms) {
                if (!currentRooms.has(room)) {
                  socket.join(room)
                }
              }
            }

            console.log(
              `[socket] Updated room subscriptions for user ${userId} (role: ${newRole})`,
            )
          }
          break
        }
      }
    } catch (err) {
      console.error(
        `[socket] Failed to process Redis message on ${channel}:`,
        err instanceof Error ? err.message : err,
      )
    }
  })

  return io
}

/**
 * Get the initialised Socket.IO server instance.
 * Returns null if `initSocketServer` has not been called yet.
 */
export function getSocketIO(): SocketIOServer | null {
  return io
}

/**
 * Gracefully shut down the Socket.IO server and Redis subscriber.
 */
export async function shutdownSocketServer(): Promise<void> {
  if (subscriber) {
    subscriber.disconnect()
    subscriber = null
  }
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => resolve())
    })
    io = null
  }
}
