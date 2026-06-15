/**
 * E2E tests for the Profile page.
 *
 * These tests run under the `profile` Playwright project, which uses the pre-
 * saved admin storage state (playwright/.auth/admin.json).  They verify that:
 *  - The profile card shows the admin user's display name ("Admin User").
 *  - The storage usage card renders with usage information.
 *  - The storage warning banner (role="alert") is NOT present, because the
 *    seeded admin has an unlimited quota (storageQuotaBytes === -1).
 */
import { test, expect } from '@playwright/test'

test.describe('Profile page', () => {
  test('Profile card shows admin user display name', async ({ page }) => {
    await page.goto('/profile')

    // The profile page fetches /api/user/profile on mount and renders the display
    // name inside a CardTitle (a <div> with heading styling, not an <h*> element).
    const displayName = page.getByText('Admin User')
    await expect(displayName).toBeVisible()
  })

  test('Storage usage card renders with usage information', async ({ page }) => {
    await page.goto('/profile')

    // The storage card heading reads "Storage Usage" from the profile.storageUsage i18n key.
    const storageHeading = page.getByRole('heading', { name: 'Storage Usage' })
    await expect(storageHeading).toBeVisible()
  })

  test('Storage warning banner is not visible for seeded admin with unlimited quota', async ({ page }) => {
    await page.goto('/profile')

    // Wait for the profile data to finish loading by checking the display name text.
    await expect(page.getByText('Admin User')).toBeVisible()

    // The StorageWarningBanner shows "Storage Almost Full" when the user is
    // near their quota.  For the seeded admin (unlimited quota) the banner
    // should not be rendered.  We match on text rather than role="alert"
    // because Next.js injects a route-announcer <div> with role="alert" on
    // every page.
    const warningBanner = page.getByText('Storage Almost Full')
    await expect(warningBanner).not.toBeVisible()
  })
})
