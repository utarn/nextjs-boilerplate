import { defineConfig } from '@playwright/test'

const PROJECT_ROOT = process.cwd()

export default defineConfig({
  testDir: './src/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Global setup — runs once before the worker process
  globalSetup: `${PROJECT_ROOT}/src/e2e/global-setup.ts`,

  // Web server entries — start Docker services, run migrations, then Next.js
  webServer: [
    {
      command: 'npx prisma migrate deploy && npx tsx prisma/seed.ts',
      port: 5442,
      reuseExistingServer: true,
      cwd: PROJECT_ROOT,
    },
    {
      command: 'npm run dev',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: true,
      cwd: PROJECT_ROOT,
    },
  ],

  // Project definitions
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'auth',
      testMatch: '**/auth.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'todos',
      testMatch: '**/todos.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/admin.json',
      },
    },
    {
      name: 'dashboard',
      testMatch: '**/dashboard.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/admin.json',
      },
    },
    {
      name: 'admin',
      testMatch: '**/admin.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/admin.json',
      },
    },
    {
      name: 'profile',
      testMatch: '**/profile.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
})
