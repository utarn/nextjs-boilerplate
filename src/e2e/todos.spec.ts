/**
 * E2E tests for Todo CRUD operations.
 *
 * These tests run with authenticated storage state (admin user) and
 * create their own test data via UI interactions — not API seeding.
 *
 * i18n translations referenced (from messages/en.json):
 *   common.edit          -> "Edit"
 *   common.save          -> "Save"
 *   common.delete        -> "Delete"
 *   todos.errorTitleRequired -> "Title is required"
 *   todos.noTodos        -> "No todos yet. Create one to get started!"
 *   todos.addTodo        -> "Add Todo"
 *   todos.priorityHigh   -> "High"
 *   todos.pending        -> "Pending"
 *   todos.inProgress     -> "In Progress"
 *   todos.completed      -> "Completed"
 */

import { test, expect } from '@playwright/test'

const PAGE_HEADING = 'My Todos'

test.beforeAll(async ({ browser }) => {
  // Clean up any todos left from previous test runs (other E2E project files
  // like dashboard.spec.ts seed data that persists in the database).
  const context = await browser.newContext({
    storageState: 'playwright/.auth/admin.json',
  })
  const page = await context.newPage()
  await page.goto('/todos')
  await page
    .getByRole('heading', { name: PAGE_HEADING })
    .waitFor({ state: 'visible', timeout: 15_000 })

  // Delete all existing todos via the authenticated browser context
  await page.evaluate(async () => {
    const res = await fetch('/api/todos')
    if (res.ok) {
      const todos = await res.json()
      for (const todo of todos) {
        await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' })
      }
    }
  })

  await context.close()
})

test.describe('Todo CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos')
    // Wait for the page to finish loading — the heading only renders after
    // the loading state (which shows "Loading...") clears.
    await expect(
      page.getByRole('heading', { name: PAGE_HEADING }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('should show empty state when no todos exist', async ({ page }) => {
    await expect(
      page.getByText('No todos yet. Create one to get started!'),
    ).toBeVisible()
  })

  test('should create a new todo with title, description, and priority', async ({ page }) => {
    // Open the create dialog
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()

    // Fill the form
    await page.locator('#create-title').fill('Create Test Todo')
    await page.locator('#create-description').fill('Test description for create')
    await page.locator('#create-priority').selectOption('HIGH')

    // Submit — scope to the dialog to pick the submit button, not the trigger
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()

    // Verify the todo appears in the list with correct title and priority badge
    await expect(page.getByText('Create Test Todo')).toBeVisible()
    await expect(page.getByText('High')).toBeVisible()
  })

  test('should show validation error when creating todo without title', async ({ page }) => {
    // Open the create dialog
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()

    // Submit without filling a title
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()

    // Verify the client-side validation error is shown
    await expect(page.getByText('Title is required')).toBeVisible()
  })

  test('should edit a todo title', async ({ page }) => {
    // First, create a todo
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()
    await page.locator('#create-title').fill('Edit Me Title')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Edit Me Title')).toBeVisible()

    // Click the edit button on the newly created todo
    // (title="Edit" from common.edit translation)
    await page.getByTitle('Edit').first().click()
    await expect(page.locator('#edit-title')).toBeVisible()

    // Change the title
    await page.locator('#edit-title').clear()
    await page.locator('#edit-title').fill('Edited Title')

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // The old title should be gone and the new one visible
    await expect(page.getByText('Edited Title')).toBeVisible()
    await expect(page.getByText('Edit Me Title')).not.toBeVisible()
  })

  test('should cycle todo status through PENDING to IN_PROGRESS to COMPLETED', async ({ page }) => {
    // Create a todo (default status: PENDING)
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()
    await page.locator('#create-title').fill('Status Cycle Todo')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Status Cycle Todo')).toBeVisible()

    // Click the status icon (SVG with cursor-pointer class) to cycle to IN_PROGRESS.
    // The tab count for In Progress starts at 0 before the click, so we verify
    // it becomes 1 after the transition.
    await page.locator('svg.cursor-pointer').first().click()
    await expect(page.getByRole('tab', { name: /In Progress.*1/ })).toBeVisible({
      timeout: 5_000,
    })

    // Click again to cycle to COMPLETED
    await page.locator('svg.cursor-pointer').first().click()
    await expect(page.getByRole('tab', { name: /Completed.*1/ })).toBeVisible({
      timeout: 5_000,
    })
  })

  test('should filter todos by status tab', async ({ page }) => {
    // Create the first todo (PENDING by default)
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()
    await page.locator('#create-title').fill('Filter Pending')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Filter Pending')).toBeVisible()

    // Create a second todo (also PENDING by default)
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()
    await page.locator('#create-title').fill('Filter Completed')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Filter Completed')).toBeVisible()

    // Cycle "Filter Completed" to COMPLETED by clicking its status icon twice
    const completedCard = page.locator('div.rounded-lg.border', {
      hasText: 'Filter Completed',
    })

    // First click: PENDING -> IN_PROGRESS
    await completedCard.locator('svg.cursor-pointer').click()
    await expect(page.getByRole('tab', { name: /In Progress.*1/ })).toBeVisible({
      timeout: 5_000,
    })

    // Second click: IN_PROGRESS -> COMPLETED
    await completedCard.locator('svg.cursor-pointer').click()
    await expect(page.getByRole('tab', { name: /Completed.*1/ })).toBeVisible({
      timeout: 5_000,
    })

    // Click the "Pending" tab — only "Filter Pending" should be visible
    await page.getByRole('tab', { name: 'Pending' }).click()
    await expect(page.getByText('Filter Pending')).toBeVisible()
    await expect(page.getByText('Filter Completed')).not.toBeVisible()

    // Click the "Completed" tab — only "Filter Completed" should be visible
    await page.getByRole('tab', { name: 'Completed' }).click()
    await expect(page.getByText('Filter Completed')).toBeVisible()
    await expect(page.getByText('Filter Pending')).not.toBeVisible()
  })

  test('should delete a todo', async ({ page }) => {
    // First, create a todo
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.locator('#create-title')).toBeVisible()
    await page.locator('#create-title').fill('Delete Me Todo')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Delete Me Todo')).toBeVisible()

    // Click the delete button (title="Delete" from common.delete translation)
    await page.getByTitle('Delete').first().click()

    // The todo should be removed from the list
    await expect(page.getByText('Delete Me Todo')).not.toBeVisible()
    // The "All" tab count should reflect the deletion (remaining todos from
    // earlier tests stay in the list, so the empty state is not asserted here).
  })
})
