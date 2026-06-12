// ---------------------------------------------------------------------------
// Channel Contracts — single source of truth for real-time channel names
// and payload types shared between EventBus (publisher) and SocketServer
// (subscriber).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Channel name constants
// ---------------------------------------------------------------------------

export const CHANNEL_TODO_CREATED = 'todo:created'
export const CHANNEL_TODO_UPDATED = 'todo:updated'
export const CHANNEL_TODO_DELETED = 'todo:deleted'
export const CHANNEL_DASHBOARD_STATS = 'dashboard:stats'
export const CHANNEL_USER_INVALIDATE = 'user:invalidate'
export const CHANNEL_ACCESS_CHANGED = 'access:changed'

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface TodoCreatedPayload {
  userId: string
  todoId: string
  title: string
}

export interface TodoUpdatedPayload {
  userId: string
  todoId: string
  status: string
}

export interface TodoDeletedPayload {
  userId: string
  todoId: string
}

export interface DashboardStatsPayload {
  userId: string
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface UserInvalidatePayload {
  userId: string
}

export interface AccessChangedPayload {
  userId: string
  newRole: string
}
