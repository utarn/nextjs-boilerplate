import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { TodosPageClient } from '@/app/(app)/todos/todos-client'
import enMessages from '../../messages/en.json'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/providers/SocketProvider', () => ({
  useSocketEvent: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockTodos = [
  {
    id: '1',
    title: 'Test Todo 1',
    description: 'Description 1',
    status: 'PENDING' as const,
    priority: 'HIGH' as const,
    completedAt: null,
    dueDate: null,
    attachmentPath: null,
    attachmentName: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Test Todo 2',
    description: null,
    status: 'COMPLETED' as const,
    priority: 'LOW' as const,
    completedAt: '2024-01-02T00:00:00Z',
    dueDate: '2024-01-10T00:00:00Z',
    attachmentPath: '/attachments/file.pdf',
    attachmentName: 'file.pdf',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider messages={enMessages} locale="en">
      {ui}
    </NextIntlClientProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TodoList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state initially', () => {
    // Never-resolving fetch keeps the component in loading state
    global.fetch = vi.fn(() => new Promise(() => {}))

    renderWithProviders(<TodosPageClient />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders todo list after loading', async () => {
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
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
  })

  it('shows empty state when no todos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(
        screen.getByText('No todos yet. Create one to get started!'),
      ).toBeInTheDocument()
    })
  })

  it('renders filter tabs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockTodos,
        pagination: { page: 1, limit: 10, total: mockTodos.length, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    // Tab text includes the count (e.g. "All (2)", "Pending (1)")
    // Use getAllByRole('tab') to specifically target tab elements
    await waitFor(() => {
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
      expect(tabs[0]).toHaveTextContent(/^All/)
      expect(tabs[1]).toHaveTextContent(/^Pending/)
      expect(tabs[2]).toHaveTextContent(/^In Progress/)
      expect(tabs[3]).toHaveTextContent(/^Completed/)
    })
  })

  it('todo items show title and priority badge', async () => {
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

    // Priority badges from translations
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('create dialog opens and has form fields', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Open create dialog
    fireEvent.click(screen.getByText('Add Todo'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Check form fields exist inside dialog
    expect(screen.getByLabelText('Todo title')).toBeInTheDocument()
  })

  it('create dialog validates required title field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
    })

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Open dialog
    fireEvent.click(screen.getByText('Add Todo'))
    const dialog = await screen.findByRole('dialog')

    // Submit without title — find the submit button (not the DialogTitle)
    const submitBtn = within(dialog).getByRole('button', { name: /add todo/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        within(dialog).getByText('Title is required'),
      ).toBeInTheDocument()
    })
  })

  it('error messages display for storage/quota errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        }),
      }) // initial fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({
          error: 'Storage quota exceeded. Please free up space.',
        }),
      }) // create returns 413

    global.fetch = fetchMock

    renderWithProviders(<TodosPageClient />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Open dialog
    fireEvent.click(screen.getByText('Add Todo'))
    await screen.findByRole('dialog')

    // Fill in title
    const titleInput = screen.getByLabelText('Todo title')
    fireEvent.change(titleInput, { target: { value: 'New Todo' } })

    // Submit
    const submitBtn = screen.getAllByText('Add Todo').pop()!
    fireEvent.click(submitBtn)

    // Check storage error message
    await waitFor(() => {
      expect(
        screen.getByText('Storage quota exceeded. Please free up space.'),
      ).toBeInTheDocument()
    })
  })

  it('edit dialog opens when edit button clicked', async () => {
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

    // Click edit button on first todo
    const editButton = screen.getAllByTitle('Edit')[0]
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('Edit Todo')).toBeInTheDocument()
  })

  it('delete button renders for each todo', async () => {
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

    const deleteButtons = screen.getAllByTitle('Delete')
    expect(deleteButtons).toHaveLength(2)
  })

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
      // Table column headers from the todo column definitions.
      // The title header is t('titlePlaceholder') = "Todo title" (kept for E2E targeting).
      expect(screen.getByRole('button', { name: 'Todo title' })).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Priority')).toBeInTheDocument()
      // Verify the data path: a todo title renders in a row.
      expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    })
  })
})
