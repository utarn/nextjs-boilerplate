/**
 * Global setup for Playwright E2E tests.
 * Runs once before the worker process launches.
 *
 * 1. Start Docker containers (postgres, redis)
 * 2. Wait for health checks (Docker healthcheck status)
 * 3. Run Prisma migrations
 * 4. Seed the database
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

const PROJECT_ROOT = process.cwd()

function run(cmd: string): string {
  return execSync(cmd, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120_000,
    env: { ...process.env },
  })
}

function hasDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

function isContainerRunning(name: string): boolean {
  try {
    const out = execSync(
      `docker ps --filter "name=${name}" --format "{{.Names}}"`,
      { stdio: 'pipe', encoding: 'utf-8', timeout: 10_000 },
    ).trim()
    return out.length > 0
  } catch {
    return false
  }
}

export default async function globalSetup(): Promise<void> {
  // Load .env so that DATABASE_URL, REDIS_URL, ENCRYPTION_SECRET, etc. are
  // available to child processes (prisma, tsx seed, etc.).
  const envPath = resolve(PROJECT_ROOT, '.env')
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    console.log('[global-setup] Loaded environment from .env')
  }

  console.log('\n[global-setup] Starting E2E environment setup...\n')

  if (!hasDocker()) {
    console.error('[global-setup] Docker is not available. Cannot start infrastructure.')
    process.exit(1)
  }

  // 1. Start Docker containers (postgres, redis)
  const pgRunning = isContainerRunning('boilerplate-postgres')
  const redisRunning = isContainerRunning('boilerplate-redis')

  if (!pgRunning || !redisRunning) {
    console.log('[global-setup] Starting Docker containers (postgres, redis)...')
    run('docker compose up -d postgres redis')
  } else {
    console.log('[global-setup] Docker containers already running.')
  }

  // 2. Wait for Postgres health (via Docker healthcheck)
  console.log('[global-setup] Waiting for Postgres to be ready...')
  const pgTimeout = 60000
  const pgStart = Date.now()
  let pgReady = false
  while (Date.now() - pgStart < pgTimeout) {
    try {
      const status = execSync(
        `docker inspect --format='{{.State.Health.Status}}' boilerplate-postgres`,
        { stdio: 'pipe', encoding: 'utf-8', timeout: 10_000 },
      ).trim()
      if (status === 'healthy') {
        pgReady = true
        break
      }
    } catch {
      // container may not exist yet
    }
    await sleep(1000)
  }
  if (!pgReady) {
    console.error('[global-setup] Postgres did not become ready in time.')
    process.exit(1)
  }
  console.log('[global-setup] Postgres is ready.')

  // 3. Wait for Redis health (via Docker healthcheck)
  console.log('[global-setup] Waiting for Redis to be ready...')
  const redisTimeout = 30000
  const redisStart = Date.now()
  let redisReady = false
  while (Date.now() - redisStart < redisTimeout) {
    try {
      const status = execSync(
        `docker inspect --format='{{.State.Health.Status}}' boilerplate-redis`,
        { stdio: 'pipe', encoding: 'utf-8', timeout: 10_000 },
      ).trim()
      if (status === 'healthy') {
        redisReady = true
        break
      }
    } catch {
      // container may not exist yet
    }
    await sleep(500)
  }
  if (!redisReady) {
    console.error('[global-setup] Redis did not become ready in time.')
    process.exit(1)
  }
  console.log('[global-setup] Redis is ready.')

  // 4. Run Prisma migrations
  console.log('[global-setup] Running Prisma migrations...')
  if (!existsSync(resolve(PROJECT_ROOT, 'prisma/migrations'))) {
    console.log('[global-setup] No migrations directory found. Skipping.')
  } else {
    run('npx prisma migrate deploy')
    console.log('[global-setup] Migrations applied.')
  }

  // 5. Seed the database
  console.log('[global-setup] Seeding the database...')
  run('npx tsx prisma/seed.ts')
  console.log('[global-setup] Database seeded.')

  console.log('[global-setup] E2E environment setup complete.\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
