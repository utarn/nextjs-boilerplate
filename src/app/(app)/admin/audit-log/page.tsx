'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'

interface AuditEntry {
  id: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  details: Record<string, unknown> | null
  createdAt: string
  user: { id: string; email: string; displayName: string } | null
}

interface AuditResponse {
  logs: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

export default function AuditLogPage() {
  const t = useTranslations('Admin.auditLog')
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const limit = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (actionFilter) params.set('action', actionFilter)
      if (actorFilter) params.set('actor', actorFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (!res.ok) throw new Error(t('errorLoading'))
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, actorFilter, dateFrom, dateTo, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs()
  }, [fetchLogs])

  const handleFilter = () => {
    setPage(1)
    fetchLogs()
  }

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const actionBadgeColor = (action: string) => {
    if (action.startsWith('user.')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (action.startsWith('todo.')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (action.startsWith('export.')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    if (action.startsWith('queue.')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('filterByAction')}</label>
              <Input
                placeholder={t('actionPlaceholder')}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('filterByActor')}</label>
              <Input
                placeholder={t('actorPlaceholder')}
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('dateFrom')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('dateTo')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4" size="sm" onClick={handleFilter}>
            {t('applyFilters')}
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
            </div>
          )}

          {!loading && !error && data && data.logs.length === 0 && (
            <div className="p-12 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('noEntries')}</p>
            </div>
          )}

          {!loading && !error && data && data.logs.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>{t('timestamp')}</TableHead>
                    <TableHead>{t('actor')}</TableHead>
                    <TableHead>{t('action')}</TableHead>
                    <TableHead>{t('target')}</TableHead>
                    <TableHead>{t('details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((entry) => (
                    <>
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <TableCell>
                          {expandedRow === entry.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {entry.user ? entry.user.email : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionBadgeColor(entry.action)} variant="secondary">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.entityType || entry.entityId || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate">
                          {entry.details ? (
                            <span className="cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                              {t('expandDetails')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === entry.id && (
                        <TableRow key={`${entry.id}-details`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">{t('details')}</h4>
                              {entry.details ? (
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-sm text-muted-foreground">{t('noDetails')}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('pageInfo', { current: data.page, total: data.totalPages, totalEntries: data.total })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
