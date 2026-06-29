import { describe, it, expect } from 'vitest'
import {
  TODO_PAGE_SIZE,
  TODO_MAX_LIMIT,
  TODO_SORTABLE_FIELDS,
  buildTodoQueryParams,
} from './todo-query'

describe('todo-query', () => {
  it('exposes the default page size and max limit', () => {
    expect(TODO_PAGE_SIZE).toBe(10)
    expect(TODO_MAX_LIMIT).toBe(100)
  })

  it('builds params for a plain first-page request (defaults only)', () => {
    const params = buildTodoQueryParams({
      sort: null,
      order: 'asc',
      page: 1,
      limit: TODO_PAGE_SIZE,
    })
    expect(params.get('page')).toBe('1')
    expect(params.get('limit')).toBe('10')
    expect(params.has('sort')).toBe(false)
    expect(params.has('order')).toBe(false)
    expect(params.has('status')).toBe(false)
  })

  it('includes status, sort, order when set', () => {
    const params = buildTodoQueryParams({
      status: 'PENDING',
      sort: 'title',
      order: 'desc',
      page: 2,
      limit: 20,
    })
    expect(params.get('status')).toBe('PENDING')
    expect(params.get('sort')).toBe('title')
    expect(params.get('order')).toBe('desc')
    expect(params.get('page')).toBe('2')
    expect(params.get('limit')).toBe('20')
  })

  it('omits sort but keeps order default when sort is null', () => {
    const params = buildTodoQueryParams({
      sort: null,
      order: 'asc',
      page: 1,
      limit: TODO_PAGE_SIZE,
    })
    expect(params.has('sort')).toBe(false)
  })

  it('TODO_SORTABLE_FIELDS is the exact whitelist', () => {
    expect([...TODO_SORTABLE_FIELDS]).toEqual([
      'title',
      'status',
      'priority',
      'dueDate',
      'createdAt',
      'updatedAt',
    ])
  })
})
