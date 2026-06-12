'use client'

import { useRouter } from 'next/navigation'
import { useSocketEvent } from '@/components/providers/SocketProvider'
import type { DashboardStatsPayload } from '@/lib/channel-types'

/**
 * Invisible client component that subscribes to real-time socket events and
 * triggers a server-side re-render of the dashboard page when any relevant
 * event arrives.
 *
 * This preserves the server-component rendering of the dashboard while still
 * providing live updates when todos change or dashboard stats are published.
 *
 * Place this inside the server-rendered dashboard page — it renders nothing
 * visible.
 */
export function LiveDashboardUpdater() {
  const router = useRouter()

  // Refresh on any todo mutation event
  useSocketEvent('todo:created', () => {
    router.refresh()
  })

  useSocketEvent('todo:updated', () => {
    router.refresh()
  })

  useSocketEvent('todo:deleted', () => {
    router.refresh()
  })

  // Refresh when the worker publishes updated dashboard stats
  useSocketEvent<DashboardStatsPayload>('dashboard:stats', () => {
    router.refresh()
  })

  return null
}
