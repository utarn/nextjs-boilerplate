import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { todoProcessingQueue, emailQueue, exportQueue } from '@/lib/queue'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'
import { getQueueJobs, VALID_QUEUE_NAMES, type ValidQueueName } from '@/lib/queue-management'

const QUEUES: Record<ValidQueueName, typeof todoProcessingQueue> = {
  'todo-processing': todoProcessingQueue,
  'email-jobs': emailQueue,
  'export-jobs': exportQueue,
}

export async function GET(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async () => {
      const { searchParams } = new URL(request.url)
      const queueName = searchParams.get('queue')

      if (queueName) {
        if (!VALID_QUEUE_NAMES.includes(queueName as ValidQueueName)) {
          return NextResponse.json({ error: `Invalid queue: ${queueName}` }, { status: 400 })
        }
        const queue = QUEUES[queueName as ValidQueueName]
        const status = searchParams.get('status') || 'failed'
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '20', 10)

        const result = await getQueueJobs(queue, status, page, limit)
        return NextResponse.json(result)
      }

      // Return counts for all queues
      const [todoStats, emailStats, exportStats] = await Promise.all([
        todoProcessingQueue.getJobCounts(),
        emailQueue.getJobCounts(),
        exportQueue.getJobCounts(),
      ])

      return NextResponse.json({
        queues: {
          [todoProcessingQueue.name]: todoStats,
          [emailQueue.name]: emailStats,
          [exportQueue.name]: exportStats,
        },
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
