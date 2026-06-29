import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from './pagination'
import type { PaginationMeta } from '@/components/datatable/columns'

const meta = (over: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  limit: 10,
  total: 25,
  totalPages: 3,
  ...over,
})

const labels = {
  previous: 'Previous',
  next: 'Next',
  of: 'of',
}

describe('Pagination', () => {
  it('renders page X of Y and prev/next buttons', () => {
    render(
      <Pagination meta={meta({ page: 2 })} onPageChange={() => {}} labels={labels} />,
    )
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('disables Previous on page 1 and Next on the last page', () => {
    const { rerender } = render(
      <Pagination meta={meta({ page: 1 })} onPageChange={() => {}} labels={labels} />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    rerender(
      <Pagination meta={meta({ page: 3 })} onPageChange={() => {}} labels={labels} />,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('calls onPageChange with adjacent page numbers', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination meta={meta({ page: 2 })} onPageChange={onPageChange} labels={labels} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination
        meta={meta({ page: 1, total: 5, totalPages: 1 })}
        onPageChange={() => {}}
        labels={labels}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
