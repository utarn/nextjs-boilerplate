'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  RefreshCw,
  RotateCcw,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueStats {
  [queueName: string]: {
    active: number
    completed: number
    delayed: number
    failed: number
    waiting: number
  }
}

interface QueueJobSummary {
  id: string | undefined
  queue: string
  status: string
  name: string
  attemptsMade: number
  maxAttempts: number
  timestamp: number | undefined
  processedOn: number | undefined
  finishedOn: number | undefined
  data: unknown
}

interface PaginatedJobs {
  jobs: QueueJobSummary[]
  total: number
  page: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_QUEUES = ['todo-processing', 'email-jobs', 'export-jobs'] as const

const STATUS_OPTIONS = [
  'all',
  'failed',
  'waiting',
  'active',
  'completed',
  'delayed',
] as const

type StatusFilter = (typeof STATUS_OPTIONS)[number]

const STAT_CARD_KEYS = ['active', 'waiting', 'delayed', 'completed', 'failed'] as const

const STAT_CARD_COLORS: Record<string, string> = {
  active: 'text-blue-500',
  waiting: 'text-yellow-500',
  delayed: 'text-orange-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

function formatDuration(ts: number | undefined): string {
  if (!ts) return '-'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function QueuesPage() {
  const t = useTranslations('Admin.queues')
  const tCommon = useTranslations('common')
  // Stats for all queues (no queue param)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Jobs for selected queue/status/page
  const [jobsData, setJobsData] = useState<PaginatedJobs | null>(null)
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)

  // Selection state
  const [activeTab, setActiveTab] = useState<string>(VALID_QUEUES[0])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Action loading per job ID
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // Refresh state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const queueLabels: Record<string, string> = {
    'todo-processing': t('queueTodoProcessing'),
    'email-jobs': t('queueEmailJobs'),
    'export-jobs': t('queueExportJobs'),
  }

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/queues')
      if (!res.ok) {
        throw new Error(t('errorLoading'))
      }
      const data = await res.json()
      setStats(data.queues)
      setStatsError(null)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : t('failedToLoadStats'))
    } finally {
      setStatsLoading(false)
    }
  }, [t])

  const fetchJobs = useCallback(
    async (queue: string, status: string, page: number) => {
      setJobsLoading(true)
      setJobsError(null)
      try {
        const effectiveStatus = status === 'all' ? 'failed' : status
        const params = new URLSearchParams({ queue, status: effectiveStatus, page: String(page), limit: '20' })
        const res = await fetch(`/api/admin/queues?${params}`)
        if (!res.ok) {
          throw new Error(t('errorLoading'))
        }
        const data: PaginatedJobs = await res.json()
        setJobsData(data)
      } catch (err) {
        setJobsError(err instanceof Error ? err.message : t('errorLoading'))
      } finally {
        setJobsLoading(false)
      }
    },
    [t],
  )

  // -----------------------------------------------------------------------
  // Side effects
  // -----------------------------------------------------------------------

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats()
  }, [fetchStats])

  // Fetch jobs when tab/status/page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs(activeTab, statusFilter, currentPage)
  }, [activeTab, statusFilter, currentPage, fetchJobs])

  // Auto-refresh with visibility-aware pause
  useEffect(() => {
    function refresh() {
      setRefreshing(true)
      Promise.all([
        fetchStats(),
        fetchJobs(activeTab, statusFilter, currentPage),
      ]).finally(() => {
        setLastUpdated(new Date())
        setRefreshing(false)
      })
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // Immediately refresh when tab becomes visible again
        refresh()
        // Restart the interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        intervalRef.current = setInterval(refresh, 30000)
      } else {
        // Pause the interval when tab is hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // Start the interval
    intervalRef.current = setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeTab, statusFilter, currentPage, fetchStats, fetchJobs])

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleRetry = useCallback(
    async (jobId: string) => {
      setActionLoading((prev) => new Set(prev).add(jobId))
      try {
        const res = await fetch(`/api/admin/queues/${jobId}/retry?queue=${activeTab}`, {
          method: 'POST',
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to retry job')
        }
        // Refresh jobs after retry
        await fetchJobs(activeTab, statusFilter, currentPage)
        await fetchStats()
      } catch (err) {
        console.error('Retry failed:', err)
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    },
    [activeTab, statusFilter, currentPage, fetchJobs, fetchStats],
  )

  const handleCancel = useCallback(
    async (jobId: string) => {
      setActionLoading((prev) => new Set(prev).add(jobId))
      try {
        const res = await fetch(`/api/admin/queues/${jobId}/cancel?queue=${activeTab}`, {
          method: 'POST',
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to cancel job')
        }
        // Refresh jobs after cancel
        await fetchJobs(activeTab, statusFilter, currentPage)
        await fetchStats()
      } catch (err) {
        console.error('Cancel failed:', err)
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    },
    [activeTab, statusFilter, currentPage, fetchJobs, fetchStats],
  )

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([
      fetchStats(),
      fetchJobs(activeTab, statusFilter, currentPage),
    ]).finally(() => {
      setLastUpdated(new Date())
      setRefreshing(false)
    })
  }, [activeTab, statusFilter, currentPage, fetchStats, fetchJobs])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    setStatusFilter('all')
    setCurrentPage(1)
  }, [])

  const handleStatusFilterChange = useCallback((status: StatusFilter) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'failed':
        return 'destructive'
      case 'completed':
        return 'default'
      case 'active':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  function renderStatsCards(queueName: string) {
    const queueStats = stats?.[queueName]
    if (!queueStats) return null

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {STAT_CARD_KEYS.map((key) => {
          const value = queueStats[key] ?? 0
          const colorClass = STAT_CARD_COLORS[key] || ''
          return (
            <Card key={key} className="text-center">
              <CardContent className="pt-6">
                <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{t(key)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  function renderStatusPills() {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_OPTIONS.map((value) => (
          <Button
            key={value}
            variant={statusFilter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilterChange(value)}
          >
            {value === 'all' ? t('all') : t(value)}
          </Button>
        ))}
      </div>
    )
  }

  function renderJobTable() {
    if (jobsLoading && !jobsData) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t('loadingJobs')}</span>
        </div>
      )
    }

    if (jobsError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tCommon('error')}</AlertTitle>
          <AlertDescription>
            {jobsError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => fetchJobs(activeTab, statusFilter, currentPage)}
            >
              {tCommon('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    if (!jobsData || jobsData.jobs.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">{t('noJobs')}</p>
          <p className="text-sm mt-1">
            {statusFilter === 'all'
              ? t('noJobsForQueue')
              : t('noJobsForStatus', { status: t(statusFilter) })}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('jobId')}</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('name')}</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{tCommon('status')}</th>
              <th className="text-center py-3 px-2 font-medium text-muted-foreground">{t('attempts')}</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('timestamp')}</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{tCommon('processing')}</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">{tCommon('finished')}</th>
              <th className="text-center py-3 px-2 font-medium text-muted-foreground">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {jobsData.jobs.map((job) => (
              <tr key={job.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-2 font-mono text-xs max-w-[80px] truncate" title={job.id}>
                  {job.id ? job.id.slice(0, 8) + '...' : '-'}
                </td>
                <td className="py-3 px-2 font-medium max-w-[160px] truncate" title={job.name}>
                  {job.name}
                </td>
                <td className="py-3 px-2">
                  <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className="text-muted-foreground">
                    {job.attemptsMade}/{job.maxAttempts}
                  </span>
                </td>
                <td className="py-3 px-2 text-xs text-muted-foreground" title={formatTimestamp(job.timestamp)}>
                  {formatDuration(job.timestamp)}
                </td>
                <td className="py-3 px-2 text-xs text-muted-foreground" title={formatTimestamp(job.processedOn)}>
                  {formatDuration(job.processedOn)}
                </td>
                <td className="py-3 px-2 text-xs text-muted-foreground" title={formatTimestamp(job.finishedOn)}>
                  {formatDuration(job.finishedOn)}
                </td>
                <td className="py-3 px-2 text-center">
                  {job.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => job.id && handleRetry(job.id)}
                      disabled={!job.id || actionLoading.has(job.id!)}
                    >
                      {actionLoading.has(job.id!) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only sm:not-sr-only sm:ml-1.5 text-xs">{t('retry')}</span>
                    </Button>
                  )}
                  {(job.status === 'waiting' || job.status === 'delayed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => job.id && handleCancel(job.id)}
                      disabled={!job.id || actionLoading.has(job.id!)}
                    >
                      {actionLoading.has(job.id!) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only sm:not-sr-only sm:ml-1.5 text-xs">{t('cancel')}</span>
                    </Button>
                  )}
                  {job.status !== 'failed' && job.status !== 'waiting' && job.status !== 'delayed' && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPagination() {
    if (!jobsData || jobsData.totalPages <= 1) return null

    const { page, totalPages, total } = jobsData

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {t('jobTotal', { total })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'outline'}
                size="sm"
                className="min-w-[2rem]"
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </Button>
            )
          })}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Loading state (initial)
  // -----------------------------------------------------------------------

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <div className="space-y-4">
          {VALID_QUEUES.map((name) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="text-lg">{queueLabels[name]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {STAT_CARD_KEYS.map((key) => (
                    <div key={key} className="text-center animate-pulse">
                      <div className="h-9 w-16 bg-muted rounded mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">{t(key)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Error state (full page)
  // -----------------------------------------------------------------------

  if (statsError && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('failedToLoadStats')}</AlertTitle>
          <AlertDescription>
            {statsError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={fetchStats}
            >
              {tCommon('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Queue Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          {VALID_QUEUES.map((name) => (
            <TabsTrigger key={name} value={name} className="flex-1 sm:flex-none">
              {queueLabels[name]}
            </TabsTrigger>
          ))}
        </TabsList>

        {VALID_QUEUES.map((name) => (
          <TabsContent key={name} value={name} className="mt-6">
            {/* Stats Cards */}
            {renderStatsCards(name)}

            {/* Status Filter Pills */}
            {renderStatusPills()}

            {/* Job Table */}
            <Card>
              <CardContent className="p-4 md:p-6">
                {renderJobTable()}
                {renderPagination()}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
