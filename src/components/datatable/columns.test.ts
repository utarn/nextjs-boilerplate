import { describe, it, expect } from 'vitest'
import type { Column, SortState, PaginationMeta } from './columns'

describe('datatable columns types', () => {
  it('a Column with sort renders the expected shape', () => {
    const col: Column<{ id: string; title: string }> = {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => row.title,
    }
    expect(col.key).toBe('title')
    expect(col.sortable).toBe(true)
    expect(col.render({ id: '1', title: 'Buy milk' })).toBe('Buy milk')
  })

  it('SortState is null when unsorted', () => {
    const s: SortState = null
    expect(s).toBeNull()
  })

  it('PaginationMeta computes totalPages from total + limit', () => {
    const meta: PaginationMeta = { page: 1, limit: 10, total: 25, totalPages: 3 }
    expect(meta.totalPages).toBe(3)
  })
})
