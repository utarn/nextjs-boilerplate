import 'dotenv/config'
import '../lib/prisma'
import { startTodoWorker } from './process-todo'
import { startEmailWorker } from './process-email'
import { todoProcessingQueue } from '@/lib/queue'

// ---------------------------------------------------------------------------
// Worker Entry Point
// ---------------------------------------------------------------------------
// Run as a separate process: npx tsx src/worker/index.ts
// Processes background jobs from BullMQ queues.
//
// On startup, registers a repeating job to check for overdue todos every hour.
// ---------------------------------------------------------------------------

async function main() {
  const todoWorker = startTodoWorker()
  const emailWorker = startEmailWorker()

  // Schedule a recurring overdue todo check (every hour)
  try {
    await todoProcessingQueue.add(
      'overdue-check',
      { todoId: '', action: 'overdue' },
      {
        repeat: { every: 3_600_000 }, // 1 hour (was incorrectly 36 s)
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    )
    console.log('[worker] Scheduled hourly overdue todo check')
  } catch (err) {
    console.warn('[worker] Could not schedule overdue check (may already exist):', err)
  }

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`\n[worker] Received ${signal}, shutting down gracefully...`)
    await Promise.all([todoWorker.close(), emailWorker.close()])
    console.log('[worker] All workers stopped.')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[worker] Failed to start:', err)
  process.exit(1)
})
