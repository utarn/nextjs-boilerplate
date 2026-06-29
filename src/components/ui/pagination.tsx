import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/components/datatable/columns'

export interface PaginationLabels {
  previous: string
  next: string
  of: string
}

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  labels: PaginationLabels
}

/**
 * Presentational prev/next pager. Renders null when there is a single page.
 * Stateless — the caller owns `meta.page` and pushes the new page through
 * `onPageChange`.
 */
export function Pagination({ meta, onPageChange, labels }: PaginationProps) {
  if (meta.totalPages <= 1) return null

  const isFirst = meta.page <= 1
  const isLast = meta.page >= meta.totalPages

  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm text-muted-foreground">
      <span>
        {`Page ${meta.page} ${labels.of} ${meta.totalPages}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isFirst}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {labels.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isLast}
          onClick={() => onPageChange(meta.page + 1)}
        >
          {labels.next}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
