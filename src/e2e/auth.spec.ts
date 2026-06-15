/**
 * E2E tests for the authentication flow.
 *
 * These tests run under the `auth` Playwright project, which has NO storage
 * state — every context starts logged out.  They verify that:
 *  - The login page renders correctly with the email input and magic link button.
 *  - Unauthenticated users are redirected to /login when they visit protected
 *    pages like /dashboard and /todos.
 *  - The ?error=invalid_token query parameter causes an error alert to appear.
 */
import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('Login page renders with email input and Send Magic Link button', async ({ page }) => {
    await page.goto('/login')

    // The email input uses a placeholder from next-intl: "Email" → "info@gmail.com"
    const emailInput = page.getByPlaceholder('info@gmail.com')
    await expect(emailInput).toBeVisible()

    // The submit button reads "Send Magic Link" from the Login.sendMagicLink key
    const sendMagicLinkButton = page.getByRole('button', { name: 'Send Magic Link' })
    await expect(sendMagicLinkButton).toBeVisible()
  })

  test('Unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')

    // The (app) layout redirects to /login when no auth_token cookie is present.
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Unauthenticated visit to /todos redirects to /login', async ({ page }) => {
    await page.goto('/todos')

    // Same layout-level redirect as the dashboard test above.
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Login page shows error alert for invalid_token query parameter', async ({ page }) => {
    await page.goto('/login?error=invalid_token')

    // The error param maps to the "errorSendFailed" i18n key (see login-client.tsx):
    // "Failed to send magic link. Please try again."
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('Failed to send magic link')
  })
})
