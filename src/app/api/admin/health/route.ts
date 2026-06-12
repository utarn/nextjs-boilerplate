import { NextRequest, NextResponse } from 'next/server'
import { withRoles } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRedisConnection } from '@/lib/redis'
import { todoProcessingQueue, emailQueue, exportQueue } from '@/lib/queue'
import { WebUserRole } from '@/generated/client'
import { handleRouteError } from '@/lib/route-guard'
import Redis from 'ioredis'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency: number
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async () => {
      // DB health check
      const dbStart = Date.now()
      let dbResult: HealthCheckResult = { status: 'healthy', latency: 0 }
      try {
        await prisma.$queryRaw`SELECT 1`
        dbResult.latency = Date.now() - dbStart
        dbResult.status = 'healthy'
      } catch (err: any) {
        dbResult.status = 'unhealthy'
        dbResult.error = err?.message || 'Database connection failed'
        dbResult.latency = Date.now() - dbStart
      }

      // Redis health check
      const redisStart = Date.now()
      let redisResult: HealthCheckResult = { status: 'healthy', latency: 0 }
      try {
        const redisOpts = getRedisConnection()
        const redis = new Redis(redisOpts)
        await redis.ping()
        await redis.quit()
        redisResult.latency = Date.now() - redisStart
        redisResult.status = 'healthy'
      } catch (err: any) {
        redisResult.status = 'unhealthy'
        redisResult.error = err?.message || 'Redis connection failed'
        redisResult.latency = Date.now() - redisStart
      }

      // Queue health checks
      const [todoCounts, emailCounts, exportCounts] = await Promise.all([
        todoProcessingQueue.getJobCounts().catch(() => null),
        emailQueue.getJobCounts().catch(() => null),
        exportQueue.getJobCounts().catch(() => null),
      ])

      const queues = {
        [todoProcessingQueue.name]: todoCounts,
        [emailQueue.name]: emailCounts,
        [exportQueue.name]: exportCounts,
      }

      const hasStalled = Object.values(queues).some(
        (q) => q !== null && q.waiting > 0 && q.active === 0,
      )

      const overallStatus =
        dbResult.status === 'unhealthy'
          ? 'unhealthy'
          : redisResult.status === 'unhealthy'
            ? 'degraded'
            : 'healthy'

      // App version
      const appVersion = process.env.npm_package_version || '0.0.1'

      return NextResponse.json({
        status: overallStatus,
        database: dbResult,
        redis: redisResult,
        queues,
        hasStalledJobs: hasStalled,
        appVersion,
        timestamp: new Date().toISOString(),
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
