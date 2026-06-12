'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency: number
  error?: string
}

interface QueueJobCounts {
  active: number
  completed: number
  delayed: number
  failed: number
  waiting: number
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  database: HealthCheckResult
  redis: HealthCheckResult
  queues: Record<string, QueueJobCounts | null>
  hasStalledJobs: boolean
  appVersion: string
  timestamp: string
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  degraded: 'secondary',
  unhealthy: 'destructive',
}

function statusIndicator(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-500'
}

function badgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_BADGE_VARIANT[status] || 'outline'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Health</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <p className="text-destructive text-lg">{message}</p>
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthCard({
  title,
  result,
}: {
  title: string
  result: HealthCheckResult
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-3 w-3 rounded-full ${statusIndicator(result.status)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{result.status}</div>
        <p className="text-xs text-muted-foreground">
          Latency: {result.latency}ms
        </p>
        {result.error && (
          <p className="text-xs text-destructive mt-1 truncate" title={result.error}>
            {result.error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/health')
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const result: HealthData = await res.json()
      setData(result)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // Auto-refresh every 30 seconds, paused when the tab is hidden
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHealth()
      }
    }, 30000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchHealth()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchHealth])

  // Loading state
  if (loading) {
    return <LoadingSkeleton />
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchHealth} />
  }

  // Empty guard (data should never be null after loading completes without error)
  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with overall status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">System Health</h1>
          <Badge variant={badgeVariant(data.status)} className="capitalize">
            {data.status}
          </Badge>
        </div>
        <Button onClick={fetchHealth} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Database and Redis health cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <HealthCard title="Database" result={data.database} />
        <HealthCard title="Redis" result={data.redis} />
      </div>

      {/* Queue health table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Queue Health</CardTitle>
            {data.hasStalledJobs && (
              <Badge variant="destructive">Stalled Jobs Detected</Badge>
            )}
          </div>
          <CardDescription>Job counts per queue</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Delayed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.queues).map(([name, counts]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{counts?.waiting ?? 'N/A'}</TableCell>
                  <TableCell>{counts?.active ?? 'N/A'}</TableCell>
                  <TableCell>{counts?.completed ?? 'N/A'}</TableCell>
                  <TableCell>{counts?.failed ?? 'N/A'}</TableCell>
                  <TableCell>{counts?.delayed ?? 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* App version card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Application Version</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-mono">{data.appVersion}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last checked: {new Date(data.timestamp).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
