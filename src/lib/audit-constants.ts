// ---------------------------------------------------------------------------
// Audit action + category constants (client-safe, no Prisma dependency)
// ---------------------------------------------------------------------------

export const AuditCategory = {
  USER: 'USER',
  TODO: 'TODO',
  EXPORT: 'EXPORT',
  ADMIN: 'ADMIN',
} as const

export type AuditCategoryType = (typeof AuditCategory)[keyof typeof AuditCategory]

export const AuditAction = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_APPROVED: 'user.approved',
  USER_REJECTED: 'user.rejected',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  TODO_CREATED: 'todo.created',
  TODO_UPDATED: 'todo.updated',
  TODO_DELETED: 'todo.deleted',
  TODO_COMPLETED: 'todo.completed',
  EXPORT_CREATED: 'export.created',
  EXPORT_COMPLETED: 'export.completed',
  QUEUE_JOB_RETRY: 'queue.job.retry',
  QUEUE_JOB_CANCEL: 'queue.job.cancel',
  ADMIN_ACTION: 'admin.action',
} as const

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction]
