import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { todoProcessingQueue, emailQueue, exportQueue } from '@/lib/queue'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'

export async function GET(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async () => {
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
