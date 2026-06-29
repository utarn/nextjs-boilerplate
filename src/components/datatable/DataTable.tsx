'use client'

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination, type PaginationLabels } from '@/components/ui/pagination'
import type { Column, PaginationMeta, SortState } from './columns'

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  sort: SortState
  onSortChange: (next: SortState) => void
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  labels: PaginationLabels
  emptyMessage?: string
  loading?: boolean
}

/**
 * Generic, controlled, server-side sortable + paginated table built on the
 * shadcn table.tsx primitives. The caller owns `sort` and `pagination` state
 * and is expected to refetch from the API when they change.
 *
 * Sort cycle on a sortable header click: unsorted -> asc -> desc -> unsorted.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  labels,
  emptyMessage = 'No data',
  loading = false,
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return
    if (!sort || sort.field !== col.key) {
      onSortChange({ field: col.key, order: 'asc' })
    } else if (sort.order === 'asc') {
      onSortChange({ field: col.key, order: 'desc' })
    } else {
      onSortChange(null)
    }
  }

  const sortIcon = (col: Column<T>) => {
    if (!col.sortable) return null
    if (sort?.field !== col.key) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" aria-hidden />
    if (sort.order === 'asc') return <ArrowUp className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    return <ArrowDown className="ml-1 inline h-3.5 w-3.5" aria-hidden />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className="inline-flex items-center font-medium text-muted-foreground hover:text-foreground"
                    aria-label={col.header}
                  >
                    {col.header}
                    {sortIcon(col)}
                  </button>
                ) : (
                  <span className="font-medium text-muted-foreground">{col.header}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Pagination meta={pagination} onPageChange={onPageChange} labels={labels} />
    </div>
  )
}
