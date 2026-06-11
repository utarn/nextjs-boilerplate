import { Worker } from 'bullmq'
import { getRedisConnection, EMAIL_QUEUE, EmailJobData } from '@/lib/queue'
import { sendEmail } from '@/lib/email'

export function startEmailWorker() {
  const worker = new Worker(EMAIL_QUEUE, async (job) => {
    const data = job.data as EmailJobData
    console.log(`[worker] Processing email job ${job.id} to: ${data.to}`)

    await sendEmail({
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    })

    return { success: true }
  }, {
    connection: getRedisConnection(),
  })

  worker.on('completed', (job) => {
    console.log(`[worker] Email job ${job.id} sent successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker] Email job ${job?.id} failed:`, err)
  })

  return worker
}
