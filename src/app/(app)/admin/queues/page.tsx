'use client'

import { useState, useEffect } from 'react'

interface QueueStats {
  [queueName: string]: {
    active: number
    completed: number
    delayed: number
    failed: number
    waiting: number
  }
}

export default function QueuesPage() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/queues')
        if (res.ok) {
          const data = await res.json()
          setStats(data.queues)
        }
      } catch (err) {
        console.error('Failed to fetch queue stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <p>Loading...</p>
  if (!stats) return <p>Failed to load queue stats</p>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Queue Management</h1>
      <div className="space-y-4">
        {Object.entries(stats).map(([name, counts]) => (
          <div key={name} className="border rounded-lg p-4">
            <h2 className="font-semibold text-lg mb-2">{name}</h2>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-500">{counts.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">{counts.waiting}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{counts.delayed}</p>
                <p className="text-xs text-muted-foreground">Delayed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{counts.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{counts.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
