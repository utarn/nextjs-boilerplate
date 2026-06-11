import { prisma } from '@/lib/prisma'

interface AuditLogOptions {
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function logAuditEvent(options: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        details: options.details ? JSON.parse(JSON.stringify(options.details)) : undefined,
      },
    })
  } catch (error) {
    // Never fail the request because audit logging failed
    console.error('Failed to log audit event:', error)
  }
}

// Audit action constants
export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  TODO_CREATED: 'todo.created',
  TODO_UPDATED: 'todo.updated',
  TODO_DELETED: 'todo.deleted',
  TODO_COMPLETED: 'todo.completed',
  EXPORT_CREATED: 'export.created',
  EXPORT_COMPLETED: 'export.completed',
  ADMIN_ACTION: 'admin.action',
}
