import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock BullMQ Worker to capture the processor function without connecting to Redis
const mockWorkerOn = vi.fn()
vi.mock('bullmq', () => ({
  Worker: vi.fn(function (_queueName: string, processor: any, _opts: any) {
    mockWorkerProcessor = processor
    return { on: mockWorkerOn }
  }),
}))

let mockWorkerProcessor: any

// Mock email sending
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}))

// Mock queue module (process-email imports getRedisConnection, EMAIL_QUEUE from here)
vi.mock('@/lib/queue', () => ({
  EMAIL_QUEUE: 'email-jobs',
  EmailJobData: {},
  getRedisConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}))

import { startEmailWorker } from '@/worker/process-email'
import { sendEmail } from '@/lib/email'
import { EMAIL_QUEUE } from '@/lib/queue'
import { Worker } from 'bullmq'

describe('process-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkerProcessor = undefined
  })

  describe('startEmailWorker', () => {
    it('creates a BullMQ Worker with the correct queue name', () => {
      const worker = startEmailWorker()

      expect(Worker).toHaveBeenCalledTimes(1)
      expect(Worker).toHaveBeenCalledWith(
        EMAIL_QUEUE,
        expect.any(Function),
        expect.objectContaining({ connection: expect.any(Object) }),
      )
      expect(worker.on).toBe(mockWorkerOn)
    })

    it('calls sendEmail with correct options and returns success', async () => {
      startEmailWorker()
      sendEmail.mockResolvedValue(undefined)

      const result = await mockWorkerProcessor({
        id: 'job-1',
        data: {
          type: 'overdue-reminder',
          to: 'user@example.com',
          subject: 'Test subject',
          html: '<p>Test</p>',
          text: 'Test text',
        },
      })

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Test subject',
        html: '<p>Test</p>',
        text: 'Test text',
      })
      expect(result).toEqual({ success: true })
    })

    it('throws error when sendEmail fails (so BullMQ can retry)', async () => {
      startEmailWorker()
      sendEmail.mockRejectedValue(new Error('SMTP connection failed'))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      await expect(
        mockWorkerProcessor({
          id: 'job-1',
          data: {
            type: 'overdue-reminder',
            to: 'user@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
            text: 'Test text',
          },
        }),
      ).rejects.toThrow('SMTP connection failed')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[worker] Email job job-1 (overdue-reminder) send failed:',
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })

    it('logs success on completed event', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      startEmailWorker()

      const completedHandler = mockWorkerOn.mock.calls.find(
        ([event]: [string]) => event === 'completed',
      )?.[1]

      completedHandler({ id: 'job-1', data: { type: 'overdue-reminder' } })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[worker] Email job job-1 (overdue-reminder) sent successfully',
      )
      consoleLogSpy.mockRestore()
    })

    it('logs error on failed event', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      startEmailWorker()

      const failedHandler = mockWorkerOn.mock.calls.find(
        ([event]: [string]) => event === 'failed',
      )?.[1]

      failedHandler({ id: 'job-1' }, new Error('SMTP error'))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[worker] Email job job-1 failed after retries:',
        expect.any(Error),
      )
      consoleErrorSpy.mockRestore()
    })
  })
})
