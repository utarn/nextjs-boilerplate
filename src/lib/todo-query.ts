// ---------------------------------------------------------------------------
// Shared contract between the Todos UI and GET /api/todos for server-side
// sort + pagination. Keep the sort whitelist here so client and server agree
// on exactly the same set of sortable fields.
// ---------------------------------------------------------------------------

export const TODO_PAGE_SIZE = 10
export const TODO_MAX_LIMIT = 100
export const TODO_SORTABLE_FIELDS = [
  'title',
  'status',
  'priority',
  'dueDate',
  'createdAt',
  'updatedAt',
] as const

export type TodoSortField = (typeof TODO_SORTABLE_FIELDS)[number]

export interface TodoQueryInput {
  status?: string | null
  sort: string | null
  order: 'asc' | 'desc'
  page: number
  limit: number
}

/**
 * Build the URLSearchParams for a GET /api/todos request. `sort` and `order`
 * are only included when a sort field is set, so a default first-page request
 * stays query-free.
 */
export function buildTodoQueryParams(input: TodoQueryInput): URLSearchParams {
  const params = new URLSearchParams()
  if (input.status && input.status !== 'all') {
    params.set('status', input.status)
  }
  if (input.sort) {
    params.set('sort', input.sort)
    params.set('order', input.order)
  }
  params.set('page', String(Math.max(1, input.page)))
  params.set('limit', String(Math.min(TODO_MAX_LIMIT, Math.max(1, input.limit))))
  return params
}
