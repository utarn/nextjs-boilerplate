/**
 * Auth setup for Playwright E2E tests.
 *
 * Creates a magic link token in the database for the admin user, navigates
 * to the verify endpoint, and saves the resulting auth cookie as Playwright
 * storage state for use by authenticated test projects.
 */
import { test as setup, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const AUTH_FILE = 'playwright/.auth/admin.json'

interface MagicLinkResult {
  token: string
  email: string
}

setup('authenticate as admin via magic link', async ({ page }) => {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not set')
  }

  // Create a magic link token via a separate tsx process (avoids ESM/CJS
  // conflicts between Playwright's compilation and the ESM-only Prisma client).
  const projectRoot = process.cwd()
  const helperPath = resolve(projectRoot, 'src/e2e/create-magic-link.ts')
  const output = execSync(`npx tsx "${helperPath}"`, {
    cwd: projectRoot,
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env },
  })

  const { token }: MagicLinkResult = JSON.parse(output.trim())

  // Navigate to the verify endpoint — this sets the auth cookie on redirect
  await page.goto(`/api/auth/verify?token=${token}`)

  // Wait for redirect to the dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect(page).toHaveURL(/\/dashboard/)

  // Save storage state (auth cookie) for reuse by other test projects
  await page.context().storageState({ path: AUTH_FILE })

  console.log(`[auth.setup] Admin auth state saved to ${AUTH_FILE}`)
})
