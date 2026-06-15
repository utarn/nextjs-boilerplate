/**
 * E2E tests for the Dashboard page.
 *
 * Authenticated as ADMIN via storage state (playwright/.auth/admin.json).
 * Seeds 3 todos with different statuses before each test and cleans up
 * afterward to keep tests isolated.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  /** Todo titles must be distinct so we can verify individual items appear. */
  const TODO_TITLES = {
    pending: 'Dashboard Test PENDING',
    inProgress: 'Dashboard Test IN_PROGRESS',
    completed: 'Dashboard Test COMPLETED',
  } as const

  /** Priorities to match the issue spec. */
  const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const

  let todoId1: string // PENDING
  let todoId2: string // IN_PROGRESS
  let todoId3: string // COMPLETED

  // ------------------------------------------------------------------
  // Seed: create 3 todos via the API, then PATCH to desired statuses.
  // ------------------------------------------------------------------

  test.beforeEach(async ({ page }) => {
    // First, delete any existing todos from previous test runs so metric
    // assertions can rely on exact counts.
    const existing = await page.request.get('/api/todos')
    if (existing.ok()) {
      const todos: { id: string }[] = await existing.json()
      for (const todo of todos) {
        try {
          await page.request.delete(`/api/todos/${todo.id}`)
        } catch {
          // Swallow individual delete errors.
        }
      }
    }

    // ── Create todo 1 — PENDING (default status) ──
    const res1 = await page.request.post('/api/todos', {
      data: {
        title: TODO_TITLES.pending,
        description: 'Seeded for e2e dashboard test — pending status',
        priority: PRIORITIES[0],
      },
    })
    expect(res1.ok()).toBeTruthy()
    todoId1 = (await res1.json()).id

    // ── Create todo 2 — will be patched to IN_PROGRESS ──
    const res2 = await page.request.post('/api/todos', {
      data: {
        title: TODO_TITLES.inProgress,
        description: 'Seeded for e2e dashboard test — in-progress status',
        priority: PRIORITIES[1],
      },
    })
    expect(res2.ok()).toBeTruthy()
    todoId2 = (await res2.json()).id

    // ── Create todo 3 — will be patched to COMPLETED ──
    const res3 = await page.request.post('/api/todos', {
      data: {
        title: TODO_TITLES.completed,
        description: 'Seeded for e2e dashboard test — completed status',
        priority: PRIORITIES[2],
      },
    })
    expect(res3.ok()).toBeTruthy()
    todoId3 = (await res3.json()).id

    // ── Update statuses via PATCH ──
    const patch2 = await page.request.patch(`/api/todos/${todoId2}`, {
      data: { status: 'IN_PROGRESS' },
    })
    expect(patch2.ok()).toBeTruthy()

    const patch3 = await page.request.patch(`/api/todos/${todoId3}`, {
      data: { status: 'COMPLETED' },
    })
    expect(patch3.ok()).toBeTruthy()
  })

  // ------------------------------------------------------------------
  // Cleanup: delete the seeded todos regardless of test outcome.
  // ------------------------------------------------------------------

  test.afterEach(async ({ page }) => {
    const ids = [todoId1, todoId2, todoId3].filter(Boolean)
    for (const id of ids) {
      try {
        await page.request.delete(`/api/todos/${id}`)
      } catch {
        // Swallow cleanup errors — they should not break subsequent tests.
      }
    }
  })

  // ------------------------------------------------------------------
  // Metric card values
  // ------------------------------------------------------------------

  test('metric cards show correct counts matching seeded data', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Check metric card labels are rendered.
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible()

    // Verify the numeric values in the metric cards grid
    // (first `div.grid` child of the main `.space-y-8` container).
    const metricCards = page.locator('.space-y-8 > .grid').first()
    const metricValues = metricCards.locator('h4')

    await expect(metricValues.nth(0)).toHaveText('3') // Total
    await expect(metricValues.nth(1)).toHaveText('1') // Pending
    await expect(metricValues.nth(2)).toHaveText('1') // In Progress
    await expect(metricValues.nth(3)).toHaveText('1') // Completed
  })

  // ------------------------------------------------------------------
  // Recent todos section
  // ------------------------------------------------------------------

  test('recent todos section displays the most recently created todo title', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // The "Recent Todos" section heading should be visible.
    await expect(page.getByText('Recent Todos')).toBeVisible()

    // Since todos are ordered by createdAt DESC, the last-created
    // todo (todo 3) should appear first.  Use `.first()` because todo
    // titles may also appear in the "Upcoming Deadlines" section.
    await expect(page.getByText(TODO_TITLES.completed).first()).toBeVisible()
    await expect(page.getByText(TODO_TITLES.inProgress).first()).toBeVisible()
    await expect(page.getByText(TODO_TITLES.pending).first()).toBeVisible()
  })

  // ------------------------------------------------------------------
  // Admin section
  // ------------------------------------------------------------------

  test('admin section shows user stats and system health for ADMIN role', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Admin section heading and subtitle.
    await expect(page.getByText('Admin Overview')).toBeVisible()
    await expect(page.getByText('System-wide statistics and health')).toBeVisible()

    // User stat labels.
    await expect(page.getByText('Total Users')).toBeVisible()
    await expect(page.getByText('Active Users')).toBeVisible()

    // System health section.
    await expect(page.getByText('System Health')).toBeVisible()
    await expect(page.getByText('Database')).toBeVisible()
    await expect(page.getByText('Redis')).toBeVisible()

    // Both services report healthy.  "Healthy" text appears once per
    // service (Database + Redis), so match the first occurrence.
    await expect(page.getByText('Healthy').first()).toBeVisible()
  })
})
