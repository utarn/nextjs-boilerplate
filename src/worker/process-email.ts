import { Worker } from 'bullmq'
import { getRedisConnection, EMAIL_QUEUE, EmailJobData } from '@/lib/queue'
import { sendEmail } from '@/lib/email'

export function startEmailWorker() {
  const worker = new Worker(
    EMAIL_QUEUE,
    async (job) => {
      const data = job.data as EmailJobData
      console.log(`[worker] Processing email job ${job.id} type=${data.type} to: ${data.to}`)

      try {
        await sendEmail({
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
        })
        return { success: true }
      } catch (err) {
        // Log the error and re-throw so BullMQ handles retries per
        // the queue's backoff configuration.  The worker never crashes
        // the process on a single failed email.
        console.error(`[worker] Email job ${job.id} (${data.type}) send failed:`, err)
        throw err
      }
    },
    {
      connection: getRedisConnection(),
    },
  )

  worker.on('completed', (job) => {
    console.log(`[worker] Email job ${job.id} (${job.data.type}) sent successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker] Email job ${job?.id} failed after retries:`, err)
  })

  return worker
}
