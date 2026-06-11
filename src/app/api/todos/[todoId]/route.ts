import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { handleRouteError, NotFoundError } from '@/lib/route-guard'
import { eventBus } from '@/lib/event-bus'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const { todoId } = await params
    return await withAuth(request, async (user) => {
      const body = await request.json()

      // Verify the todo belongs to the user
      const existing = await prisma.todo.findFirst({
        where: { id: todoId, userId: user.userId },
      })

      if (!existing) {
        throw new NotFoundError('Todo not found')
      }

      const todo = await prisma.todo.update({
        where: { id: todoId },
        data: {
          title: body.title,
          description: body.description,
          status: body.status,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        },
      })

      // Enqueue background job if status changed to completed
      if (body.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
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

      await logAuditEvent({
        userId: user.userId,
        action: AUDIT_ACTIONS.TODO_UPDATED,
        entityType: 'todo',
        entityId: todo.id,
        details: { changes: body },
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
      // Verify the todo belongs to the user
      const existing = await prisma.todo.findFirst({
        where: { id: todoId, userId: user.userId },
      })

      if (!existing) {
        throw new NotFoundError('Todo not found')
      }

      await prisma.todo.delete({
        where: { id: todoId },
      })

      // Publish real-time event
      await eventBus.todoDeleted({
        userId: user.userId,
        todoId,
      })

      await logAuditEvent({
        userId: user.userId,
        action: AUDIT_ACTIONS.TODO_DELETED,
        entityType: 'todo',
        entityId: todoId,
      })

      return NextResponse.json({ success: true })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
