import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from './DataTable'
import type { Column, PaginationMeta } from './columns'

interface Row {
  id: string
  title: string
  status: string
}

const columns: Column<Row>[] = [
  { key: 'title', header: 'Title', sortable: true, render: (r) => r.title },
  { key: 'status', header: 'Status', render: (r) => r.status },
]

const meta: PaginationMeta = { page: 1, limit: 10, total: 2, totalPages: 1 }

const labels = {
  previous: 'Previous',
  next: 'Next',
  of: 'of',
}

describe('DataTable', () => {
  it('renders headers and rows', () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', title: 'Buy milk', status: 'PENDING' }]}
        rowKey={(r) => r.id}
        sort={null}
        onSortChange={() => {}}
        pagination={meta}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('shows empty message when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        sort={null}
        onSortChange={() => {}}
        pagination={meta}
        onPageChange={() => {}}
        emptyMessage="No data"
        labels={labels}
      />,
    )
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('clicking a sortable header toggles asc -> desc -> unsorted and calls onSortChange', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        sort={null}
        onSortChange={onSortChange}
        pagination={meta}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    // First click: unsorted -> asc
    fireEvent.click(screen.getByText('Title'))
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'title', order: 'asc' })

    // Re-render with the applied sort (asc) and click again -> desc
    rerender(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        sort={{ field: 'title', order: 'asc' }}
        onSortChange={onSortChange}
        pagination={meta}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    fireEvent.click(screen.getByText('Title'))
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'title', order: 'desc' })

    // Re-render with desc and click again -> unsorted
    rerender(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        sort={{ field: 'title', order: 'desc' }}
        onSortChange={onSortChange}
        pagination={meta}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    fireEvent.click(screen.getByText('Title'))
    expect(onSortChange).toHaveBeenLastCalledWith(null)
  })

  it('non-sortable headers do not call onSortChange and show no sort icon button', () => {
    const onSortChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        sort={null}
        onSortChange={onSortChange}
        pagination={meta}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    fireEvent.click(screen.getByText('Status'))
    expect(onSortChange).not.toHaveBeenCalled()
    // The Status header should not be a button
    expect(screen.queryByRole('button', { name: 'Status' })).not.toBeInTheDocument()
  })
})
