import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { handleRouteError } from '@/lib/route-guard'
import { eventBus } from '@/lib/event-bus'

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
      const body = await request.json()

      if (!body.title || typeof body.title !== 'string') {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
      }

      const todo = await prisma.todo.create({
        data: {
          userId: user.userId,
          title: body.title,
          description: body.description || null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      })

      // Enqueue background job to process the new todo
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
        details: { title: todo.title },
      })

      return NextResponse.json(todo, { status: 201 })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
