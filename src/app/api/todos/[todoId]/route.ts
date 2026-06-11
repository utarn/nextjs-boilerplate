import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { checkUserQuota } from '@/lib/quota'
import { handleRouteError, NotFoundError } from '@/lib/route-guard'
import { eventBus } from '@/lib/event-bus'
import { getStorageAdapter } from '@/lib/storage'
import { TodoPriority, TodoStatus } from '@/generated/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const { todoId } = await params
    return await withAuth(request, async (user) => {
      const existing = await prisma.todo.findFirst({
        where: { id: todoId, userId: user.userId },
      })

      if (!existing) {
        throw new NotFoundError('Todo not found')
      }

      const contentType = request.headers.get('content-type') || ''
      const isMultipart = contentType.includes('multipart/form-data')

      let title: string | undefined
      let description: string | undefined | null
      let dueDate: string | undefined | null
      let priority: string | undefined
      let status: string | undefined
      let file: File | null = null
      let removeAttachment = false

      if (isMultipart) {
        const formData = await request.formData()
        const t = formData.get('title')
        if (t !== null) title = t as string
        const d = formData.get('description')
        if (d !== null) description = d as string
        const dd = formData.get('dueDate')
        if (dd !== null) dueDate = dd as string
        const p = formData.get('priority')
        if (p !== null) priority = p as string
        const s = formData.get('status')
        if (s !== null) status = s as string

        const attachmentFile = formData.get('attachment')
        if (attachmentFile && attachmentFile instanceof File && attachmentFile.size > 0) {
          file = attachmentFile
        }
        removeAttachment = formData.get('removeAttachment') === 'true'
      } else {
        const body = await request.json()
        title = body.title
        description = body.description
        dueDate = body.dueDate
        priority = body.priority
        status = body.status
      }

      // Validate priority if provided
      if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
      }

      // Validate status if provided
      if (status !== undefined && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }

      // Handle attachment changes
      let newAttachmentPath = existing.attachmentPath
      let newAttachmentName = existing.attachmentName
      let newAttachmentSize = existing.attachmentSize

      // Case 1: Remove attachment
      if (removeAttachment && existing.attachmentPath) {
        const storage = getStorageAdapter()
        await storage.delete(existing.attachmentPath)

        // Decrement storage used bytes
        await prisma.webUser.update({
          where: { id: user.userId },
          data: { storageUsedBytes: { increment: -Number(existing.attachmentSize) } },
        })

        newAttachmentPath = null
        newAttachmentName = null
        newAttachmentSize = null
      }

      // Case 2: Replace with new file (or add file to existing todo without attachment)
      if (file) {
        // Check storage quota for the new file
        const storageCheck = await checkUserQuota(user.userId, 'storage')
        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > storageCheck.remaining) {
          return NextResponse.json(
            { error: 'Storage quota exceeded. Free up space or contact your administrator.' },
            { status: 413 },
          )
        }

        const storage = getStorageAdapter()

        // Delete old attachment if it exists
        if (existing.attachmentPath) {
          await storage.delete(existing.attachmentPath)
          await prisma.webUser.update({
            where: { id: user.userId },
            data: { storageUsedBytes: { increment: -Number(existing.attachmentSize) } },
          })
        }

        // Upload new file
        const buffer = Buffer.from(await file.arrayBuffer())
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        const key = `todos/${user.userId}/${uniqueSuffix}_${file.name}`
        await storage.upload(key, buffer)

        // Update storage used bytes
        await prisma.webUser.update({
          where: { id: user.userId },
          data: { storageUsedBytes: { increment: file.size } },
        })

        newAttachmentPath = key
        newAttachmentName = file.name
        newAttachmentSize = BigInt(file.size)
      }

      // Determine if status is being changed to completed
      const becomingCompleted = status === 'COMPLETED' && existing.status !== 'COMPLETED'
      const completedAt = becomingCompleted ? new Date() : undefined

      const todo = await prisma.todo.update({
        where: { id: todoId },
        data: {
          attachmentPath: newAttachmentPath,
          attachmentName: newAttachmentName,
          attachmentSize: newAttachmentSize,
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(status !== undefined ? { status: status as TodoStatus } : {}),
          ...(priority !== undefined ? { priority: priority as TodoPriority } : {}),
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
          ...(completedAt !== undefined ? { completedAt } : {}),
        } as any,
      })

      // Enqueue background job if status changed to completed
      if (becomingCompleted) {
        await todoProcessingQueue.add('todo-completed', {
          todoId: todo.id,
          action: 'completed',
        } as TodoProcessingJobData)
      }

      // Publish real-time event
      await eventBus.todoUpdated({
        userId: user.userId,
        todoId: todo.id,
        status: todo.status,
      })

      // Audit log
      const changes: Record<string, unknown> = {}
      if (title !== undefined) changes.title = title
      if (status !== undefined) changes.status = status
      if (priority !== undefined) changes.priority = priority
      if (removeAttachment) changes.attachment = 'removed'
      if (file) changes.attachment = 'replaced'

      await logAuditEvent({
        userId: user.userId,
        action: becomingCompleted ? AUDIT_ACTIONS.TODO_COMPLETED : AUDIT_ACTIONS.TODO_UPDATED,
        entityType: 'todo',
        entityId: todo.id,
        details: Object.keys(changes).length > 0 ? { changes } : undefined,
      })

      return NextResponse.json(todo)
    })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const { todoId } = await params
    return await withAuth(request, async (user) => {
      const existing = await prisma.todo.findFirst({
        where: { id: todoId, userId: user.userId },
      })

      if (!existing) {
        throw new NotFoundError('Todo not found')
      }

      // Delete attachment from storage if it exists
      if (existing.attachmentPath) {
        const storage = getStorageAdapter()
        await storage.delete(existing.attachmentPath)

        // Decrement storage used bytes
        if (existing.attachmentSize) {
          await prisma.webUser.update({
            where: { id: user.userId },
            data: { storageUsedBytes: { increment: -Number(existing.attachmentSize) } },
          })
        }
      }

      await prisma.todo.delete({
        where: { id: todoId },
      })

      // Publish real-time event
      await eventBus.todoDeleted({
        userId: user.userId,
        todoId,
      })

      // Audit log
      await logAuditEvent({
        userId: user.userId,
        action: AUDIT_ACTIONS.TODO_DELETED,
        entityType: 'todo',
        entityId: todoId,
        details: existing.attachmentPath ? { hadAttachment: true } : undefined,
      })

      return NextResponse.json({ success: true })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
