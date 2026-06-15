/**
 * E2E tests for the Admin User Management page.
 *
 * These tests run under the `admin` Playwright project, which uses the pre-saved
 * admin storage state (playwright/.auth/admin.json).  They verify that:
 *  - The users table renders on page load with user rows.
 *  - The logged-in admin user appears with ADMIN role and ACTIVE status badges.
 *  - Filter tabs (All/Pending/Active/Inactive) filter users correctly.
 *  - The Approve button on a PENDING user changes their status to ACTIVE.
 *
 * A PENDING user is created via Prisma in beforeEach and cleaned up in afterEach
 * to keep tests isolated.
 */
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

test.describe('Admin User Management', () => {
  let pendingUserId: string
  let pendingEmail: string

  // ------------------------------------------------------------------
  // Setup: create a PENDING user via Prisma for each test.
  // ------------------------------------------------------------------

  test.beforeEach(async () => {
    const projectRoot = process.cwd()
    const helperPath = resolve(projectRoot, 'src/e2e/create-pending-user.ts')
    const output = execSync(`npx tsx "${helperPath}"`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env },
    })
    const result = JSON.parse(output.trim()) as { id: string; email: string }
    pendingUserId = result.id
    pendingEmail = result.email
  })

  // ------------------------------------------------------------------
  // Cleanup: delete the created user regardless of test outcome.
  // ------------------------------------------------------------------

  test.afterEach(async () => {
    if (pendingUserId) {
      const projectRoot = process.cwd()
      const helperPath = resolve(projectRoot, 'src/e2e/delete-user.ts')
      execSync(`npx tsx "${helperPath}" "${pendingUserId}"`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30_000,
        env: { ...process.env },
      })
    }
  })

  // ------------------------------------------------------------------
  // Tests
  // ------------------------------------------------------------------

  test('Users table displays with user rows on page load', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for the page heading to confirm the admin users page has loaded.
    await expect(
      page.getByRole('heading', { name: 'User Management' }),
    ).toBeVisible()

    // The table element should be rendered on the page.
    const table = page.getByRole('table')
    await expect(table).toBeVisible()

    // The table body should have at least one row (the header row
    // is in <thead>, so <tbody> rows represent user data).
    const bodyRows = table.locator('tbody tr')
    await expect(bodyRows).not.toHaveCount(0)
  })

  test('Admin user appears with ADMIN role and ACTIVE status badges', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for the page to load.
    await expect(
      page.getByRole('heading', { name: 'User Management' }),
    ).toBeVisible()

    // The seeded admin user (admin@example.com / "Admin User") should be in
    // the table.  Find the row containing their email.
    const adminRow = page
      .getByRole('row')
      .filter({ hasText: 'admin@example.com' })
    await expect(adminRow).toBeVisible()

    // The role badge (Admin.users.userRoleAdmin → "Admin") should be present.
    // Use exact: true to avoid matching "Admin User" (display name) or "admin@example.com" (email).
    await expect(adminRow.getByText('Admin', { exact: true })).toBeVisible()

    // The status badge (Admin.users.active → "Active") should be present.
    await expect(adminRow.getByText('Active')).toBeVisible()
  })

  test('Filter tabs correctly filter users', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for the page to load.
    await expect(
      page.getByRole('heading', { name: 'User Management' }),
    ).toBeVisible()

    // The "All" tab is active by default, showing all users including the
    // PENDING user we created in beforeEach.
    await expect(page.getByText(pendingEmail)).toBeVisible()

    // Click the "Pending" tab — the pending user should still be visible.
    await page.getByRole('tab', { name: /Pending/ }).click()
    await expect(page.getByText(pendingEmail)).toBeVisible()

    // Click the "Active" tab — the pending user should NOT be visible.
    await page.getByRole('tab', { name: /Active/ }).click()
    await expect(page.getByText(pendingEmail)).not.toBeVisible()

    // Click the "Inactive" tab — the pending user should NOT be visible.
    await page.getByRole('tab', { name: /Inactive/ }).click()
    await expect(page.getByText(pendingEmail)).not.toBeVisible()
  })

  test('Approve button changes PENDING user to ACTIVE status', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for the page to load.
    await expect(
      page.getByRole('heading', { name: 'User Management' }),
    ).toBeVisible()

    // Switch to the "Pending" tab to see only PENDING users.
    await page.getByRole('tab', { name: /Pending/ }).click()

    // Find the row for our seeded pending user.
    const userRow = page
      .getByRole('row')
      .filter({ hasText: pendingEmail })
    await expect(userRow).toBeVisible()

    // Click the "Approve" button on this user.
    await userRow.getByRole('button', { name: 'Approve' }).click()

    // Wait for the action to complete: the re-fetched data no longer shows
    // this user as PENDING, so the row should disappear from the Pending tab.
    await expect(userRow).not.toBeVisible()

    // Switch to the "Active" tab.
    await page.getByRole('tab', { name: /Active/ }).click()

    // The approved user should now appear in the Active list.
    const activeRow = page
      .getByRole('row')
      .filter({ hasText: pendingEmail })
    await expect(activeRow).toBeVisible()

    // The status badge should now show "Active".
    await expect(activeRow.getByText('Active')).toBeVisible()
  })
})
