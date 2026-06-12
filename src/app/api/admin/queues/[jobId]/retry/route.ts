import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { todoProcessingQueue, emailQueue, exportQueue } from '@/lib/queue'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'
import { retryQueueJob, VALID_QUEUE_NAMES, type ValidQueueName } from '@/lib/queue-management'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

const QUEUES: Record<ValidQueueName, typeof todoProcessingQueue> = {
  'todo-processing': todoProcessingQueue,
  'email-jobs': emailQueue,
  'export-jobs': exportQueue,
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params
    return await withRoles(request, [WebUserRole.ADMIN], async (admin) => {
      const { searchParams } = new URL(request.url)
      const queueName = searchParams.get('queue')
      if (!queueName || !VALID_QUEUE_NAMES.includes(queueName as ValidQueueName)) {
        return NextResponse.json({ error: 'Valid queue param required' }, { status: 400 })
      }

      const queue = QUEUES[queueName as ValidQueueName]
      const result = await retryQueueJob(queue, jobId)

      await logAuditEvent({
        userId: admin.userId,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        entityType: 'bullmq-job',
        entityId: jobId,
        details: { action: 'retry', queue: queueName },
      })

      return NextResponse.json(result)
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
