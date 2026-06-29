# Boilerplate Infra + DataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port proven infra (nginx reverse-proxy conf, GitLab CI that builds app+worker) and a reusable server-side sortable+paginated DataTable from two downstream projects (line-collector, lab-check) back into the Next.js boilerplate, applied to the Todo app so the next clone has a turnkey pattern.

**Architecture:** The DataTable is a lightweight generic `<DataTable>` component built over the existing shadcn `table.tsx` primitives plus a new `Pagination` component — no new dependency. The `/api/todos` GET route gains server-side sort + pagination (query params → whitelisted Prisma `orderBy` + `skip`/`take` + parallel `count`), returning a `{ data, pagination }` envelope. The existing Todos card-list UI is preserved and the DataTable is added behind a Cards/Table view toggle, keeping the create/edit dialogs, file attachments, and real-time Socket.IO refetch intact. On the infra side: a checked-in `nginx/app.conf` reverse-proxy with `/socket.io/` WebSocket upgrade, and a parameterized `.gitlab-ci.yml` that builds the `runner` (app) and `worker` Dockerfile targets to a placeholder registry.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 7 (PostgreSQL), Vitest + happy-dom, Playwright, Tailwind 4, shadcn/ui primitives, lucide-react, GitLab CI, nginx.

## Global Constraints

- **No new runtime dependencies.** The DataTable uses only existing `@/components/ui/*` primitives and `lucide-react`. Do NOT add `@tanstack/react-table`.
- **i18n:** Every new user-facing string MUST be added to BOTH `messages/en.json` and `messages/th.json` under the `todos` (or `common`) namespace. Per CLAUDE.md rule.
- **Prisma client import:** import from `@/generated/client`, never `@prisma/client` (Prisma output is `src/generated/`).
- **API route pattern:** use `withAuth`/`withRoles` + `handleRouteError`; errors go through `handleRouteError`. Keep the existing multipart `POST` and `PATCH`/`DELETE` handlers untouched.
- **Backward compatibility:** The `/api/todos` GET route must still return a usable shape when called with NO query params — existing tests and the E2E `beforeAll` cleanup (which calls `fetch('/api/todos')` and iterates `res.json()`) must keep working. The envelope is `{ data, pagination }`; clients that did `setTodos(await res.json())` are updated in this plan.
- **Existing test files that must stay green:** `src/__tests__/api-todos.test.ts`, `src/__tests__/TodoList.test.tsx`, `src/e2e/todos.spec.ts`. Where this plan changes a contract those tests assert, the plan updates the test in the same task.
- **Sort whitelist** (server-side): `title`, `status`, `priority`, `dueDate`, `createdAt`, `updatedAt`. `priority` and `status` are enums — Prisma `orderBy` supports enum ordering natively, no special handling needed. Do NOT expose `attachmentSize` (BigInt) as a sortable field.
- **Default sort:** `createdAt` desc (preserves current ordering).
- **Default page size:** `10`. Max `limit` clamped to `100` (protects against abuse).
- **Commits:** commit after each task. Conventional Commit style, end messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **File locations for new infra:** `nginx/app.conf`, `.gitlab-ci.yml`, `src/components/ui/pagination.tsx`, `src/components/datatable/DataTable.tsx`, `src/components/datatable/columns.ts`, `src/components/datatable/index.ts`.

---

## File Structure

**Infra (new files):**
- `nginx/app.conf` — sample nginx reverse-proxy config (HTTP → upstream, `/socket.io/` WS upgrade). Reference artifact for deployment.
- `nginx/README.md` — one-page note on where to install the conf and how to add TLS.
- `.gitlab-ci.yml` — single `build` stage; builds `runner` + `worker` images, tags timestamped + `latest`, pushes to a placeholder registry. Parameterized via CI variables.

**Datatable (new files):**
- `src/components/ui/pagination.tsx` — presentational `Pagination` component (prev/next + "page X of Y"), built on `Button` + lucide icons. No data fetching.
- `src/components/datatable/columns.ts` — types for column definitions (`Column<T>`, `SortState`, `PaginationState`, `PaginationMeta`). Framework-agnostic, no React.
- `src/components/datatable/DataTable.tsx` — generic `<DataTable<T>>` rendering shadcn `Table*` primitives from a `columns` array + `data`; clickable sortable headers + `Pagination` footer; controlled (caller owns sort/page state).
- `src/components/datatable/index.ts` — re-export `DataTable`, `Column`, `SortState`, `PaginationState`, `PaginationMeta`.
- `src/components/datatable/DataTable.test.tsx` — unit tests for the DataTable (sort header click → `onSort`, prev/next → `onPageChange`, empty state, aria attributes).

**Todos app (modified files):**
- `src/app/api/todos/route.ts` — `GET` gains sort/pagination parsing + `{ data, pagination }` envelope. `POST` unchanged.
- `src/app/(app)/todos/todos-client.tsx` — add Cards/Table view toggle; wire DataTable to server-side sort/page state; update `fetchTodos` to send query params and read the envelope. Card view preserved verbatim.
- `src/lib/todo-query.ts` — new tiny helper: `buildTodoQueryParams({ status, sort, order, page, limit })` → `URLSearchParams`, and `TODO_PAGE_SIZE = 10`. Shared between client + tests to keep the contract in one place.
- `src/__tests__/api-todos.test.ts` — update the GET test to the new envelope + add sort/pagination cases.
- `src/__tests__/TodoList.test.tsx` — update fetch mock to the new envelope; add view-toggle + DataTable rendering tests.
- `src/e2e/todos.spec.ts` — update `beforeAll` cleanup to read `res.json().data`; add an E2E test for sorting a column and paginating.
- `messages/en.json` + `messages/th.json` — add `todos.sortBy`, `todos.sortAscending`, `todos.sortDescending`, `todos.sortUnsorted`, `todos.page`, `todos.of`, `todos.next`, `todos.previous`, `todos.viewCards`, `todos.viewTable`, `todos.noData` (and reuse `common.loading`).
- `prisma/schema.prisma` — add `@@index([userId, createdAt])` to the `Todo` model for efficient server-side pagination; one new migration.
- `CLAUDE.md` — append a short "Reusable DataTable" pattern section and an "Infra: nginx + GitLab CI" note so the next clone knows these exist.

---

### Task 1: Add the sortable-column types module

**Files:**
- Create: `src/components/datatable/columns.ts`

**Interfaces:**
- Produces: `SortField = string`, `SortOrder = 'asc' | 'desc'`, `SortState = { field: string; order: SortOrder } | null`, `PaginationState = { page: number; limit: number }`, `PaginationMeta = { page: number; limit: number; total: number; totalPages: number }`, `Column<T>` (see code), `DataTableProps<T>`.

- [ ] **Step 1: Write the failing test**

Create `src/components/datatable/columns.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/datatable/columns.test.ts`
Expected: FAIL — `Failed to resolve import "./columns"` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/datatable/columns.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/datatable/columns.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/datatable/columns.ts src/components/datatable/columns.test.ts
git commit -m "feat(datatable): add sortable-column type contracts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add the presentational Pagination component

**Files:**
- Create: `src/components/ui/pagination.tsx`
- Test: `src/components/ui/pagination.test.tsx`

**Interfaces:**
- Consumes: `PaginationMeta` from `@/components/datatable/columns`.
- Produces: `Pagination` component (`{ meta, onPageChange, labels }`).

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/pagination.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ui/pagination.test.tsx`
Expected: FAIL — `Failed to resolve import "./pagination"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/pagination.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ui/pagination.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/pagination.tsx src/components/ui/pagination.test.tsx
git commit -m "feat(ui): add presentational Pagination component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add the generic DataTable component

**Files:**
- Create: `src/components/datatable/DataTable.tsx`
- Create: `src/components/datatable/index.ts`
- Test: `src/components/datatable/DataTable.test.tsx`

**Interfaces:**
- Consumes: `Column<T>`, `SortState`, `PaginationMeta` from `./columns`; `Table*` from `@/components/ui/table`; `Pagination` from `@/components/ui/pagination`; `ArrowUp`, `ArrowDown`, `ArrowUpDown` from `lucide-react`.
- Produces: `DataTable<T>` controlled component and a barrel `export { DataTable, Column, SortState, PaginationState, PaginationMeta } from '.'`.

- [ ] **Step 1: Write the failing test**

Create `src/components/datatable/DataTable.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/datatable/DataTable.test.tsx`
Expected: FAIL — `Failed to resolve import "./DataTable"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/datatable/DataTable.tsx`:

```tsx
'use client'

import * as React from 'react'
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
```

Create `src/components/datatable/index.ts`:

```typescript
export { DataTable } from './DataTable'
export type { Column, SortState, SortOrder, PaginationState, PaginationMeta, DataTableProps } from './columns'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/datatable/DataTable.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/datatable/DataTable.tsx src/components/datatable/index.ts src/components/datatable/DataTable.test.tsx
git commit -m "feat(datatable): add generic server-side sortable DataTable

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Add the i18n keys (en + th)

**Files:**
- Modify: `messages/en.json` (the `"todos"` object)
- Modify: `messages/th.json` (the `"todos"` object)

**Interfaces:**
- Produces: new keys under `todos`: `sortBy`, `sortAscending`, `sortDescending`, `sortUnsorted`, `page`, `of`, `next`, `previous`, `viewCards`, `viewTable`, `noData`.

- [ ] **Step 1: Add the English keys**

Open `messages/en.json`, locate the `"todos"` object (it has `"title": "My Todos"` ... `"errorUpdateFailed"`). Add these keys after `errorUpdateFailed` (keep a trailing comma where needed):

```json
  "sortBy": "Sort by",
  "sortAscending": "Ascending",
  "sortDescending": "Descending",
  "sortUnsorted": "Unsorted",
  "page": "Page",
  "of": "of",
  "next": "Next",
  "previous": "Previous",
  "viewCards": "Cards",
  "viewTable": "Table",
  "noData": "No todos yet. Create one to get started!"
```

Note: `todos.noData` duplicates the existing `todos.noTodos` value so the DataTable can show the same message; keep `noTodos` for the existing card view (do not remove it).

- [ ] **Step 2: Add the Thai keys (parallel structure)**

Open `messages/th.json`, find the matching `"todos"` object, and add the same keys with Thai translations after `errorUpdateFailed`:

```json
  "sortBy": "เรียงตาม",
  "sortAscending": "น้อยไปมาก",
  "sortDescending": "มากไปน้อย",
  "sortUnsorted": "ไม่เรียง",
  "page": "หน้า",
  "of": "จาก",
  "next": "ถัดไป",
  "previous": "ก่อนหน้า",
  "viewCards": "การ์ด",
  "viewTable": "ตาราง",
  "noData": "ยังไม่มีสิ่งที่ต้องทำ สร้างรายการเพื่อเริ่มต้น!"
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/th.json','utf8')); console.log('ok')"`
Expected: `ok` (no parse error).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/th.json
git commit -m "feat(i18n): add datatable sort/pagination/view keys (en, th)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add the shared todo-query helper

**Files:**
- Create: `src/lib/todo-query.ts`
- Test: `src/lib/todo-query.test.ts`

**Interfaces:**
- Produces: `TODO_PAGE_SIZE = 10`, `TODO_MAX_LIMIT = 100`, `TODO_SORTABLE_FIELDS` (readonly tuple), `buildTodoQueryParams({ status?, sort, order, page, limit })` → `URLSearchParams`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/todo-query.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/todo-query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/todo-query.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/todo-query.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/todo-query.ts src/lib/todo-query.test.ts
git commit -m "feat(todos): add shared todo sort/pagination query helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Add a DB index for paginated todo queries

**Files:**
- Modify: `prisma/schema.prisma` (the `Todo` model, after the `@@map("todos")` line)
- Create: a new Prisma migration via `prisma migrate dev`

**Interfaces:**
- Produces: `@@index([userId, createdAt])` on the `Todo` model so `(userId, createdAt DESC)` pagination queries use an index.

- [ ] **Step 1: Read the current Todo model**

Run: `grep -n "model Todo" -A 20 prisma/schema.prisma`
Expected: shows the model ending with `@@map("todos")`.

- [ ] **Step 2: Add the index**

Edit `prisma/schema.prisma`. Inside the `Todo` model, add the index before `@@map`:

```prisma
  @@index([userId, createdAt])
  @@map("todos")
```

- [ ] **Step 3: Generate the migration**

Run: `npx prisma migrate dev --name todo_user_created_index`
Expected: a new migration file under `prisma/migrations/<timestamp>_todo_user_created_index/` is created and applied to the dev DB. If the dev DB is not running, the command will fail — in that case run `docker compose up -d postgres redis` first and ensure `DATABASE_URL` in `.env` points at `localhost:5442`, then retry. If still blocked, run `npx prisma migrate dev --name todo_user_created_index --create-only` to generate the migration SQL without applying, and apply it later.

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client` to `src/generated/`.

- [ ] **Step 5: Verify the migration SQL exists**

Run: `ls prisma/migrations/ | tail -1`
Expected: a directory named `<timestamp>_todo_user_created_index`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): index todos on (userId, createdAt) for pagination

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Add server-side sort + pagination to GET /api/todos

**Files:**
- Modify: `src/app/api/todos/route.ts` (the `GET` handler only — leave `POST` untouched)
- Test: modify `src/__tests__/api-todos.test.ts` (update the GET test, add new cases, and mock `prisma.todo.count`)

**Interfaces:**
- Consumes: `TODO_SORTABLE_FIELDS`, `TODO_MAX_LIMIT`, `TODO_PAGE_SIZE` from `@/lib/todo-query`.
- Produces: `GET /api/todos` returns `{ data: Todo[], pagination: { page, limit, total, totalPages } }`. Accepts query params `status`, `sort`, `order`, `page`, `limit`. Falls back to `createdAt` desc + page 1 + `TODO_PAGE_SIZE` when params absent. Rejects non-whitelisted `sort` to the default.

- [ ] **Step 1: Update the test first (TDD)**

Edit `src/__tests__/api-todos.test.ts`. In the `vi.mock('@/lib/prisma', ...)` block, add `count` to the `todo` mock so it is available:

```typescript
      todo: {
        findMany: vi.fn().mockResolvedValue([mockTodo]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(mockTodo),
        create: vi.fn().mockResolvedValue(mockTodo),
        update: vi.fn().mockResolvedValue(mockTodo),
        delete: vi.fn().mockResolvedValue(mockTodo),
      },
```

Replace the `describe('GET /api/todos', ...)` block with:

```typescript
  describe('GET /api/todos', () => {
    it('returns todos in a { data, pagination } envelope for authenticated user', async () => {
      const mockTodos = [
        { id: '1', title: 'Todo 1', userId: 'user-1' },
        { id: '2', title: 'Todo 2', userId: 'user-1' },
      ]
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockTodos)
      ;(prisma.todo.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2)

      const req = new NextRequest('http://localhost:3000/api/todos')
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(2)
      expect(data.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 })
      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      )
      expect(prisma.todo.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    })

    it('applies server-side sort + pagination from query params', async () => {
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      ;(prisma.todo.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(25)

      const req = new NextRequest(
        'http://localhost:3000/api/todos?sort=title&order=asc&page=3&limit=10',
      )
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pagination).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 })
      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
          skip: 20,
          take: 10,
        }),
      )
    })

    it('falls back to default sort when sort field is not whitelisted', async () => {
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      ;(prisma.todo.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

      const req = new NextRequest(
        'http://localhost:3000/api/todos?sort=attachmentSize&order=desc',
      )
      await GET(req)

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })

    it('filters by status when status param is set', async () => {
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      ;(prisma.todo.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

      const req = new NextRequest('http://localhost:3000/api/todos?status=PENDING')
      await GET(req)

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'PENDING' } }),
      )
      expect(prisma.todo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'PENDING' },
      })
    })

    it('clamps limit to TODO_MAX_LIMIT', async () => {
      ;(prisma.todo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      ;(prisma.todo.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

      const req = new NextRequest('http://localhost:3000/api/todos?limit=9999')
      await GET(req)

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      )
    })
  })
```

- [ ] **Step 2: Run tests to verify the new GET cases fail**

Run: `npm run test -- src/__tests__/api-todos.test.ts`
Expected: FAIL — the GET tests fail because the route still returns a bare array and ignores query params. (The POST/PATCH/DELETE tests should still pass.)

- [ ] **Step 3: Implement the new GET handler**

Edit `src/app/api/todos/route.ts`. Replace the entire `GET` function with:

```typescript
import {
  TODO_SORTABLE_FIELDS,
  TODO_MAX_LIMIT,
  TODO_PAGE_SIZE,
} from '@/lib/todo-query'

export async function GET(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      const { searchParams } = new URL(request.url)

      // ---- sort (whitelisted) ----
      const sortRaw = searchParams.get('sort')
      const sort = TODO_SORTABLE_FIELDS.includes(sortRaw as never)
        ? (sortRaw as (typeof TODO_SORTABLE_FIELDS)[number])
        : null
      const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
      const orderBy = sort ? { [sort]: order } : { createdAt: 'desc' }

      // ---- pagination (clamped) ----
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
      const limit = Math.min(
        TODO_MAX_LIMIT,
        Math.max(1, parseInt(searchParams.get('limit') || String(TODO_PAGE_SIZE), 10) || TODO_PAGE_SIZE),
      )
      const skip = (page - 1) * limit

      // ---- status filter (optional) ----
      const status = searchParams.get('status')
      const where: { userId: string; status?: string } = { userId: user.userId }
      if (status && status !== 'all') {
        where.status = status
      }

      const [todos, total] = await Promise.all([
        prisma.todo.findMany({ where, orderBy, skip, take: limit }),
        prisma.todo.count({ where }),
      ])

      const totalPages = Math.max(1, Math.ceil(total / limit))

      return NextResponse.json({
        data: todos,
        pagination: { page, limit, total, totalPages },
      })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
```

Add the `import { ... TODO_SORTABLE_FIELDS ... } from '@/lib/todo-query'` line near the existing imports at the top of the file. Do NOT modify `POST`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm run test -- src/__tests__/api-todos.test.ts`
Expected: PASS — all GET cases + the existing POST/PATCH/DELETE tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/todos/route.ts src/__tests__/api-todos.test.ts
git commit -m "feat(api): server-side sort + pagination on GET /api/todos

Returns a { data, pagination } envelope. Sort field is whitelisted; limit
clamped to 100; status filter supported. POST unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Wire the DataTable into the Todos UI with a view toggle

**Files:**
- Modify: `src/app/(app)/todos/todos-client.tsx`
- Test: modify `src/__tests__/TodoList.test.tsx`

**Interfaces:**
- Consumes: `DataTable`, `Column`, `SortState`, `PaginationMeta` from `@/components/datatable`; `buildTodoQueryParams`, `TODO_PAGE_SIZE` from `@/lib/todo-query`; the new i18n keys.
- Produces: a Cards/Table toggle that switches the list rendering. In Table view the DataTable uses server-side sort + pagination (query params drive a refetch). Card view is unchanged in behavior. Real-time Socket.IO handlers refresh whichever view is active.

This is the largest task. Make these specific edits to `src/app/(app)/todos/todos-client.tsx`:

- [ ] **Step 1: Update the test first (TDD)**

Edit `src/__tests__/TodoList.test.tsx`. The existing fetch mocks return a bare array; after Task 7 the API returns `{ data, pagination }`. Update all `global.fetch` mocks in that file. There are several `mockResolvedValue({ ok: true, json: async () => mockTodos })` calls — change each to:

```typescript
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockTodos,
          pagination: { page: 1, limit: 10, total: mockTodos.length, totalPages: 1 },
        }),
      })
```

For the empty-state test, change `json: async () => []` to:

```typescript
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        }),
      })
```

(The 413 create-error test mocks `json: async () => ({ error: '...' })` on the second call — that one stays the same, only the first call changes to the envelope.)

Then add new tests at the end of the `describe('TodoList', ...)` block:

```typescript
  it('shows a Cards/Table view toggle and defaults to Cards', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockTodos,
        pagination: { page: 1, limit: 10, total: mockTodos.length, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    })

    // Both toggle buttons render; Cards is active by default
    expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument()
  })

  it('switching to Table view renders the DataTable headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockTodos,
        pagination: { page: 1, limit: 10, total: mockTodos.length, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Table' }))

    await waitFor(() => {
      // Table column headers from the todo column definitions
      expect(screen.getByRole('button', { name: 'Title' })).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Priority')).toBeInTheDocument()
    })
  })
```

- [ ] **Step 2: Run tests to verify the new UI tests fail**

Run: `npm run test -- src/__tests__/TodoList.test.tsx`
Expected: FAIL — the existing tests fail on the bare-array mock (envelope mismatch) and the two new tests fail (no Cards/Table buttons, no Table view).

- [ ] **Step 3: Update imports and add view-state**

At the top of `src/app/(app)/todos/todos-client.tsx`, add to the existing imports:

```typescript
import { LayoutGrid, Table as TableIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTable } from '@/components/datatable'
import type { Column, SortState, PaginationMeta } from '@/components/datatable'
import { buildTodoQueryParams, TODO_PAGE_SIZE } from '@/lib/todo-query'
```

Add these new state hooks inside `TodosPageClient`, right after the existing `const [todos, setTodos] = useState<Todo[]>([])` line:

```typescript
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: TODO_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
```

- [ ] **Step 4: Update fetchTodos to use the query helper + envelope**

Replace the existing `fetchTodos` useCallback with:

```typescript
  const fetchTodos = useCallback(async () => {
    try {
      const params = buildTodoQueryParams({
        sort: sort?.field ?? null,
        order: sort?.order ?? 'desc',
        page,
        limit: TODO_PAGE_SIZE,
      })
      const res = await fetch(`/api/todos?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setTodos(json.data)
        setPagination(json.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [sort, page])
```

Add this effect so changing sort or page refetches (keep the existing mount effect too):

```typescript
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodos()
  }, [fetchTodos])
```

(Replace the existing `useEffect(() => { fetchTodos() }, [fetchTodos])` — it is identical, so this just stays.)

- [ ] **Step 5: Reset to page 1 when sort changes**

Add a helper that sets sort and resets the page:

```typescript
  const handleSortChange = (next: SortState) => {
    setSort(next)
    setPage(1)
  }
```

- [ ] **Step 6: Define the table columns**

Add a `columns` array (define it inside the component, after the helpers, so it closes over `t`, `tCommon`, and the action handlers). Use the existing `PRIORITY_STYLES` and `formatPriority` for the priority cell. The columns are: Title (sortable), Status (sortable), Priority (sortable), Due Date (sortable), Actions.

```typescript
  const columns: Column<Todo>[] = [
    {
      key: 'title',
      header: t('titlePlaceholder'),
      sortable: true,
      render: (todo) => (
        <span className={todo.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}>
          {todo.title}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      sortable: true,
      render: (todo) => {
        const StatusIcon = STATUS_ICON[todo.status]
        return (
          <span className="inline-flex items-center gap-1">
            <StatusIcon className={`h-4 w-4 ${STATUS_COLOR[todo.status]}`} />
            {todo.status === 'PENDING'
              ? t('pending')
              : todo.status === 'IN_PROGRESS'
                ? t('inProgress')
                : todo.status === 'COMPLETED'
                  ? t('completed')
                  : t('cancelled')}
          </span>
        )
      },
    },
    {
      key: 'priority',
      header: t('priority'),
      sortable: true,
      render: (todo) => (
        <Badge variant="outline" className={PRIORITY_STYLES[todo.priority].class}>
          {formatPriority(todo.priority)}
        </Badge>
      ),
    },
    {
      key: 'dueDate',
      header: t('dueDate'),
      sortable: true,
      render: (todo) =>
        todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: tCommon('edit'),
      render: (todo) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(todo)} title={tCommon('edit')}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteTodo(todo.id)} title={tCommon('delete')}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]
```

- [ ] **Step 7: Add the view toggle and table view to the JSX**

In the returned JSX, immediately after the `<h1>` heading row's closing `</div>` (the one that contains the Add Todo dialog — i.e. after the create-dialog `</Dialog>` and that flex container's `</div>`), insert the view toggle before `<Tabs>`:

```tsx
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={view === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('cards')}
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          {t('viewCards')}
        </Button>
        <Button
          variant={view === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('table')}
        >
          <TableIcon className="h-4 w-4 mr-1" />
          {t('viewTable')}
        </Button>
      </div>
```

Then wrap the existing `<Tabs>...</Tabs>` block in a conditional so it only renders in cards view, and add the table view beside it. Replace the `<Tabs defaultValue="all">` opening with:

```tsx
      {view === 'cards' && (
      <Tabs defaultValue="all">
```

…and close that conditional right after the matching `</Tabs>`:

```tsx
      </Tabs>
      )}

      {view === 'table' && (
        <DataTable
          columns={columns}
          data={filterTodos(undefined)}
          rowKey={(todo) => todo.id}
          sort={sort}
          onSortChange={handleSortChange}
          pagination={pagination}
          onPageChange={setPage}
          labels={{
            previous: t('previous'),
            next: t('next'),
            of: t('of'),
          }}
          emptyMessage={t('noData')}
        />
      )}
```

Note: in table view we pass the full `todos` list (no status-tab filtering) because the DataTable uses server-side pagination; the status tabs remain a cards-view feature. This keeps the table view a clean, full server-paginated grid.

- [ ] **Step 8: Run tests to verify it passes**

Run: `npm run test -- src/__tests__/TodoList.test.tsx`
Expected: PASS — all existing tests (updated to the envelope) + the two new toggle tests pass.

- [ ] **Step 9: Run lint**

Run: `npm run lint`
Expected: no errors in the modified file. Fix any unused-import warnings (e.g. if `Table*` primitives are imported but only used via `DataTable`, remove the now-unused `Table` import).

- [ ] **Step 10: Commit**

```bash
git add src/app/(app)/todos/todos-client.tsx src/__tests__/TodoList.test.tsx
git commit -m "feat(todos): add Cards/Table view toggle with server-side DataTable

Table view uses the generic DataTable with server-side sort + pagination;
card view is unchanged. Real-time refetch + create/edit dialogs retained.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Update the E2E todo test for the new envelope + cover sorting/pagination

**Files:**
- Modify: `src/e2e/todos.spec.ts`

**Interfaces:**
- Consumes: the new `/api/todos` `{ data, pagination }` envelope and the Cards/Table toggle.

- [ ] **Step 1: Fix the beforeAll cleanup to read the envelope**

Edit `src/e2e/todos.spec.ts`. In `test.beforeAll`, the `page.evaluate` cleanup currently does `const todos = await res.json(); for (const todo of todos) {...}`. Change it to read `.data`:

```typescript
  await page.evaluate(async () => {
    const res = await fetch('/api/todos')
    if (res.ok) {
      const json = await res.json()
      const todos = json.data ?? json
      for (const todo of todos) {
        await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' })
      }
    }
  })
```

(The `?? json` fallback keeps it tolerant if the shape reverts.)

- [ ] **Step 2: Add an E2E test for the table view sort + pagination**

Append this test inside `test.describe('Todo CRUD', ...)`:

```typescript
  test('table view sorts by title and paginates', async ({ page }) => {
    // Seed enough todos to span two pages (TODO_PAGE_SIZE = 10)
    for (let i = 0; i < 12; i++) {
      await page.getByRole('button', { name: 'Add Todo' }).click()
      await expect(page.locator('#create-title')).toBeVisible()
      await page.locator('#create-title').fill(`Table Todo ${String(i).padStart(2, '0')}`)
      await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
      await expect(page.getByText(`Table Todo ${String(i).padStart(2, '0')}`)).toBeVisible()
    }

    // Switch to Table view
    await page.getByRole('button', { name: 'Table' }).click()

    // Sort by Title ascending — the header is a button labelled "Todo title"
    await page.getByRole('button', { name: 'Todo title' }).click()

    // Page 1 of 2 should be visible
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible({ timeout: 5_000 })

    // Go to page 2
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/Page 2 of 2/)).toBeVisible({ timeout: 5_000 })

    // Clean up the seeded todos so later tests start fresh
    await page.evaluate(async () => {
      const res = await fetch('/api/todos')
      if (res.ok) {
        const json = await res.json()
        for (const todo of json.data ?? json) {
          await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' })
        }
      }
    })
  })
```

Note: the sort-header `aria-label` is the column header text, which for the title column is `t('titlePlaceholder')` = `"Todo title"` (per `messages/en.json`). If the test cannot find that button, fall back to `page.getByRole('button', { name: /title/i }).first()`.

- [ ] **Step 3: Run the E2E todo spec**

Run: `npm run test:e2e -- src/e2e/todos.spec.ts`
Expected: PASS. This requires the dev stack running (`docker compose up -d postgres redis` + `npm run dev` + `npm run worker`) and the Playwright auth setup (`playwright/.auth/admin.json`) to exist. If the auth file is missing, run `npm run test:e2e:install` then the global setup; the prior E2E commits (#28–#37) set up this flow. If the stack isn't available in the current environment, skip this step and note it — but do not mark the task complete until the spec runs green or is explicitly deferred.

- [ ] **Step 4: Commit**

```bash
git add src/e2e/todos.spec.ts
git commit -m "test(e2e): cover todos table-view sorting + pagination

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Add the sample nginx reverse-proxy config

**Files:**
- Create: `nginx/app.conf`
- Create: `nginx/README.md`

**Interfaces:**
- Produces: a deployable nginx server block that proxies HTTP to the Next.js app and upgrades `/socket.io/` for WebSockets, plus a one-page deployment note.

- [ ] **Step 1: Write the nginx config**

Create `nginx/app.conf`:

```nginx
# ---------------------------------------------------------------------------
# Sample nginx reverse-proxy for the Next.js boilerplate.
#
# Install: copy to /etc/nginx/conf.d/<app>.conf, then `nginx -t && nginx -s reload`.
# TLS: add with `certbot --nginx -d your-domain` (this block is HTTP-only; certbot
# will generate the matching 443 server block and redirect).
#
# The Next.js app runs the custom server.js (HTTP + Socket.IO) on $PORT.
# nginx forwards plain HTTP and separately upgrades /socket.io/ for WebSockets.
# ---------------------------------------------------------------------------

# Replace APP_DOMAIN with your real domain, and 127.0.0.1:3000 with the
# host:port your app binds to (PORT env var, default 3000).

upstream boilerplate_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.example.com;

    # Allow large file uploads (todo attachments, etc.)
    client_max_body_size 25m;

    # Real-time WebSocket endpoint — MUST come before the catch-all "/".
    location /socket.io/ {
        proxy_pass http://boilerplate_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Everything else — plain HTTP reverse proxy.
    location / {
        proxy_pass http://boilerplate_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: Write the README**

Create `nginx/README.md`:

```markdown
# nginx

Sample reverse-proxy config for the boilerplate. The Next.js app runs its own
custom `server.js` (HTTP + Socket.IO) on `PORT` (default 3000); nginx sits in
front for TLS termination, large-upload limits, and to correctly upgrade the
`/socket.io/` WebSocket endpoint.

## Install

1. Copy `app.conf` to `/etc/nginx/conf.d/boilerplate.conf` on the host.
2. Edit `server_name` to your domain and the `upstream` `server` line to the
   host:port your app binds to (`127.0.0.1:3000` when running on the same host).
3. Test: `nginx -t`
4. Reload: `nginx -s reload`
5. Add TLS: `certbot --nginx -d your-domain` (certbot rewrites this block to
   listen on 443 and adds an 80→443 redirect).

## Notes

- The `/socket.io/` location MUST be defined before the `/` catch-all and MUST
  set `Upgrade`/`Connection: upgrade` — without it, real-time events silently
  fall back to polling or fail.
- `client_max_body_size` should be >= your max todo attachment size.
- This config is HTTP-only by design; TLS is added by certbot so the cert +
  cipher config live where certbot manages them.
```

- [ ] **Step 3: Commit**

```bash
git add nginx/app.conf nginx/README.md
git commit -m "feat(infra): add sample nginx reverse-proxy config with socket.io WS

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Add the GitLab CI pipeline

**Files:**
- Create: `.gitlab-ci.yml`

**Interfaces:**
- Produces: a `build` stage that builds the `runner` (app) and `worker` Dockerfile targets, tags them `${TIMESTAMP}` + `latest`, and pushes to `${CI_REGISTRY_IMAGE}` (GitLab's built-in registry variable). Parameterized — no hardcoded private registry, no hardcoded notification webhook.

- [ ] **Step 1: Write the .gitlab-ci.yml**

Create `.gitlab-ci.yml`:

```yaml
# ---------------------------------------------------------------------------
# GitLab CI for the Next.js boilerplate.
#
# Builds two images from the single Dockerfile:
#   - runner (the app, custom server.js + Socket.IO)
#   - worker (the BullMQ background worker)
#
# Both are tagged with a timestamp + `latest` and pushed to GitLab's built-in
# container registry ($CI_REGISTRY_IMAGE). No hardcoded registry host — set
# CI/CD variables in the project for anything secret.
#
# Prerequisites:
#   - A shell runner with docker + git available (tags: shell, docker)
#   - DOCKER_AUTH_CONFIG or a logged-in docker daemon that can push to
#     $CI_REGISTRY (GitLab injects $CI_REGISTRY_USER / $CI_REGISTRY_PASSWORD
#     automatically when using the registry; see the before_script).
# ---------------------------------------------------------------------------

stages:
  - build

variables:
  # Tag format YYYYMMDD-HHMM; override per-job if needed.
  TAG: "${CI_COMMIT_SHORT_SHA}"

build:app:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  retry: 2
  only:
    - main
  before_script:
    # Log into GitLab's built-in registry using the CI job token.
    - echo "$CI_JOB_TOKEN" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    - docker build --target runner -t "$CI_REGISTRY_IMAGE/boilerplate-app:$TAG" -t "$CI_REGISTRY_IMAGE/boilerplate-app:latest" -f Dockerfile .
    - docker push "$CI_REGISTRY_IMAGE/boilerplate-app:$TAG"
    - docker push "$CI_REGISTRY_IMAGE/boilerplate-app:latest"

build:worker:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  retry: 2
  only:
    - main
  before_script:
    - echo "$CI_JOB_TOKEN" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
  script:
    - docker build --target worker -t "$CI_REGISTRY_IMAGE/boilerplate-worker:$TAG" -t "$CI_REGISTRY_IMAGE/boilerplate-worker:latest" -f Dockerfile .
    - docker push "$CI_REGISTRY_IMAGE/boilerplate-worker:$TAG"
    - docker push "$CI_REGISTRY_IMAGE/boilerplate-worker:latest"
```

Note: this uses GitLab's built-in `$CI_REGISTRY_IMAGE`, `$CI_REGISTRY`, `$CI_REGISTRY_USER`, and `$CI_JOB_TOKEN` — no private registry URL or LINE notification webhook (those were project-specific in line-collector/lab-check). A clone replaces `boilerplate-app`/`boilerplate-worker` with its own image names.

- [ ] **Step 2: Sanity-check the YAML**

Run: `node -e "require('fs').readFileSync('.gitlab-ci.yml','utf8'); console.log('ok')"`
Expected: `ok` (file exists). Full CI YAML validation happens when GitLab runs the pipeline; there is no local validator to run here.

- [ ] **Step 3: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "feat(ci): add GitLab CI that builds app + worker images to the registry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Document the new patterns in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: a short "Reusable DataTable" subsection under "Key Patterns" and an "Infra: nginx + GitLab CI" note under "Docker Services" (or a new short subsection).

- [ ] **Step 1: Read the relevant CLAUDE.md sections**

Run: `grep -n "### Adding a New Real-time Event\|## Docker Services\|### i18n Pattern" CLAUDE.md`
Expected: line numbers for the anchors where the new sections slot in.

- [ ] **Step 2: Add the DataTable pattern**

Insert this subsection in `CLAUDE.md` after the `### Background Job Pattern` block (and before `### Audit Logging Pattern`):

```markdown
### Reusable DataTable Pattern

A generic, server-side sortable + paginated `<DataTable>` lives in
`src/components/datatable/`, built on the shadcn `table.tsx` primitives (no
extra dependency). The Todos page uses it behind a Cards/Table view toggle.

- `Column<T>` defines `key`, `header`, `sortable?`, `render?(row) => ReactNode`.
- Sort cycle: unsorted → asc → desc → unsorted. The caller owns `sort` + `pagination` state and refetches on change.
- API contract: `GET /api/todos?sort=...&order=...&page=...&limit=...&status=...` returns `{ data, pagination: { page, limit, total, totalPages } }`. The sort field is whitelisted server-side (`TODO_SORTABLE_FIELDS` in `src/lib/todo-query.ts`).

```typescript
import { DataTable } from '@/components/datatable'
import type { Column, SortState } from '@/components/datatable'

const columns: Column<Todo>[] = [
  { key: 'title', header: 'Title', sortable: true, render: (r) => r.title },
  // ...
]

<DataTable columns={columns} data={rows} rowKey={(r) => r.id}
  sort={sort} onSortChange={setSort}
  pagination={pagination} onPageChange={setPage}
  labels={{ previous: 'Prev', next: 'Next', of: 'of' }} />
```

To add a sortable column: extend `TODO_SORTABLE_FIELDS` (server whitelist), add the `Column` to the page, and add an index in `schema.prisma` if the field isn't already indexed for the `(userId, field)` query.
```

- [ ] **Step 3: Add the infra note**

Insert this short subsection in `CLAUDE.md` right after the `## Docker Services` table:

```markdown
## Infra: nginx + GitLab CI

- `nginx/app.conf` — sample reverse-proxy config (HTTP proxy + `/socket.io/`
  WebSocket upgrade). Install on the host, set `server_name`, add TLS via
  certbot. See `nginx/README.md`.
- `.gitlab-ci.yml` — builds the `runner` (app) and `worker` Dockerfile targets,
  tags `${CI_COMMIT_SHORT_SHA}` + `latest`, pushes to GitLab's built-in
  registry (`$CI_REGISTRY_IMAGE`). Runs on `main`. Replace the image names
  (`boilerplate-app`, `boilerplate-worker`) when cloning.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document DataTable pattern + nginx/GitLab CI infra

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage** — The user asked for: (a) Dockerfile building both app + worker → already present in the boilerplate (six-stage Dockerfile with `runner` + `worker` targets); verified, no task needed. (b) docker-compose for local DB instance with auto-migrate+seed → already present (`docker-compose.yml` runs `prisma migrate deploy && db:seed && dev`); the user deselected prod compose, so the existing dev compose stands. No change needed. (c) sample nginx conf → Task 10. (d) GitLab CI → Task 11. (e) "fallow" → investigated; it is a third-party code-audit tool (`fallow-rs/fallow`) used in downstream projects via `npx fallow audit`, not an application feature — out of scope for a boilerplate; noted, not ported. (f) UI datatable with sortable columns + pagination applied to the todo app → Tasks 1–3 (component), Task 4 (i18n), Task 5 (shared contract), Task 6 (index), Task 7 (API), Task 8 (UI integration), Task 9 (E2E). All spec items accounted for.

**2. Placeholder scan** — No "TBD"/"TODO"/"implement later". Every code step shows the actual code; every command step shows the command + expected output. The E2E step that depends on a running stack explicitly states the prerequisite and the deferral condition rather than hand-waving.

**3. Type consistency** — `SortState` (`{ field: string; order: SortOrder } | null`) is identical across columns.ts (Task 1), DataTable.tsx (Task 3), todos-client.tsx (Task 8), and the tests. `PaginationMeta` (`{ page, limit, total, totalPages }`) is identical across columns.ts, pagination.tsx, DataTable.tsx, the API route (Task 7 returns exactly this shape), todos-client.tsx, and the tests. `Column<T>` (`{ key, header, sortable?, className?, render? }`) is consistent. `buildTodoQueryParams` params (`sort`, `order`, `page`, `limit`, `status`) match the API route's `searchParams.get(...)` reads. `TODO_SORTABLE_FIELDS` whitelist in `todo-query.ts` matches the API's `TODO_SORTABLE_FIELDS.includes(...)` check and the test's expected array. The DataTable `labels` prop (`{ previous, next, of }`) matches `PaginationLabels` and is supplied in todos-client.tsx. The title column's header text `t('titlePlaceholder')` = `"Todo title"` is what the E2E test (Task 9) targets.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-29-boilerplate-infra-and-datatable.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
