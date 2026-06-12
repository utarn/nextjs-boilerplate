import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { enforceUserQuota, checkUserQuota, getStorageUsage } from '@/lib/quota'
import { handleRouteError } from '@/lib/route-guard'
import { eventBus } from '@/lib/event-bus'
import { getStorageAdapter } from '@/lib/storage'
import { TodoPriority } from '@/generated/client'
import { sendQuotaWarningEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      const todos = await prisma.todo.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(todos)
    })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      const contentType = request.headers.get('content-type') || ''
      const isMultipart = contentType.includes('multipart/form-data')

      let title: string
      let description: string | null = null
      let dueDate: string | null = null
      let priority: string = 'MEDIUM'
      let file: File | null = null

      if (isMultipart) {
        const formData = await request.formData()
        title = (formData.get('title') as string) || ''
        description = (formData.get('description') as string) || null
        dueDate = (formData.get('dueDate') as string) || null
        priority = (formData.get('priority') as string) || 'MEDIUM'
        const attachmentFile = formData.get('attachment')
        if (attachmentFile && attachmentFile instanceof File && attachmentFile.size > 0) {
          file = attachmentFile
        }
      } else {
        const body = await request.json()
        title = body.title
        description = body.description || null
        dueDate = body.dueDate || null
        priority = body.priority || 'MEDIUM'
      }

      if (!title || typeof title !== 'string') {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
      }

      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
      }

      // Enforce todo count quota
      await enforceUserQuota(user.userId, 'todos')

      let attachmentPath: string | null = null
      let attachmentName: string | null = null
      let attachmentSize: bigint | null = null

      if (file) {
        // Enforce file count quota
        await enforceUserQuota(user.userId, 'files')

        // Check storage quota
        const storageCheck = await checkUserQuota(user.userId, 'storage')
        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > storageCheck.remaining) {
          return NextResponse.json(
            { error: 'Storage quota exceeded. Free up space or contact your administrator.' },
            { status: 413 },
          )
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
        const key = `todos/${user.userId}/${uniqueSuffix}_${file.name}`

        const storage = getStorageAdapter()
        await storage.upload(key, buffer)

        attachmentPath = key
        attachmentName = file.name
        attachmentSize = BigInt(file.size)

        // Update user's storage used bytes
        await prisma.webUser.update({
          where: { id: user.userId },
          data: { storageUsedBytes: { increment: file.size } },
        })

        // Check remaining storage against the configurable warning
        // threshold and enqueue a quota warning email if needed
        // (fire-and-forget so SMTP failures don't crash the web server).
        const thresholdMB = parseInt(
          process.env.QUOTA_WARNING_THRESHOLD_MB || '100',
          10,
        )
        getStorageUsage(user.userId)
          .then(({ usedBytes, quotaBytes }) => {
            const remainingBytes = quotaBytes - usedBytes
            const remainingMB = Number(remainingBytes / BigInt(1048576))
            if (quotaBytes > 0 && remainingMB < thresholdMB) {
              sendQuotaWarningEmail({
                to: user.email,
                displayName: user.displayName,
                usedBytes,
                quotaBytes,
                remainingBytes,
              }).catch((err) => {
                console.error('[todos] Failed to send quota warning:', err)
              })
            }
          })
          .catch((err) => {
            console.error('[todos] Failed to check storage quota:', err)
          })
      }

      const todo = await prisma.todo.create({
        data: {
          userId: user.userId,
          title,
          description: description || null,
          priority: priority as TodoPriority,
          dueDate: dueDate ? new Date(dueDate) : null,
          attachmentPath,
          attachmentName,
          attachmentSize,
        },
      })

      // Enqueue background job
      await todoProcessingQueue.add('todo-created', {
        todoId: todo.id,
        action: 'created',
      } as TodoProcessingJobData)

      // Publish real-time event
      await eventBus.todoCreated({
        userId: user.userId,
        todoId: todo.id,
        title: todo.title,
      })

      // Audit log
      await logAuditEvent({
        userId: user.userId,
        action: AUDIT_ACTIONS.TODO_CREATED,
        entityType: 'todo',
        entityId: todo.id,
        details: { title: todo.title, priority },
      })

      return NextResponse.json(todo, { status: 201 })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
