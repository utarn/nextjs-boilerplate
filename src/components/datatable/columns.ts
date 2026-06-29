// ---------------------------------------------------------------------------
// DataTable type contracts — framework-agnostic (no React) so they can be
// imported by tests, API routes, and the component alike.
// ---------------------------------------------------------------------------

export type SortOrder = 'asc' | 'desc'

/** null = unsorted. */
export type SortState = { field: string; order: SortOrder } | null

export interface PaginationState {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Column definition for a generic row type T.
 * - `key`        stable identifier (also used as the sort field when sortable)
 * - `header`      visible column header text
 * - `sortable`   when true, the header is a clickable sort toggle
 * - `className`  optional Tailwind classes applied to <td> cells in this column
 * - `render`     maps a row to a ReactNode cell. Omit to render `row[key]`.
 */
export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render?: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  sort: SortState
  onSortChange: (next: SortState) => void
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  emptyMessage?: string
  loading?: boolean
}
