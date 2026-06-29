# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Next.js Production Boilerplate

A production-ready Next.js boilerplate designed as a reference for spinning up new projects. The repo is a *template* — understand what it wires together before you change anything.

## Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.2.7 |
| UI | React | 19.2.6 |
| Language | TypeScript | 6.x |
| Database | PostgreSQL + Prisma | 7.8.0 |
| Queue | BullMQ + Redis | 5.56.0 |
| i18n | next-intl | 4.13.0 |
| Auth | JWT (httpOnly cookies) + Google SSO + Magic Link | jsonwebtoken 9.x |
| UI Library | shadcn/ui + Radix UI | latest |
| CSS | Tailwind CSS | 4.x |
| Real-time | Socket.IO + Redis pub/sub bridge | 4.8.3 |
| Email | Nodemailer (fire-and-forget via BullMQ) | 8.x |
| Testing | Vitest + Happy DOM | 4.x |
| Charts | Recharts | 3.8.0 |
| Icons | Lucide React | 1.17.0 |
| Font | Prompt (Google Fonts) | via next/font |

All versions are pinned and tested together — do not upgrade without testing.

## Common Commands

```bash
# ── Development ──
npm run dev                            # Next.js dev server (http://localhost:3000)
npm run worker                         # BullMQ background worker (separate terminal)
bash dev.sh                            # Docker infra + app + worker in one script

# ── Build & Production ──
npm run build                          # Production build (output: 'standalone')
npm run start                          # Start production server
node server.js                         # Custom server (Socket.IO, used in Docker prod)
docker compose up -d --build           # Full stack via Docker

# ── Testing ──
npm run test                           # All unit tests (Vitest, happy-dom)
npm run test src/__tests__/auth.test.ts  # Single test file
npm run test -- -t "pattern"           # Run tests matching name pattern
npm run test:watch                     # Watch mode
npm run test:integration               # Integration tests (Vitest, node env)
npm run test:all                       # Unit + integration
npm run test:coverage                  # Coverage report

# ── Lint ──
npm run lint                           # ESLint across the project

# ── Database ──
npx prisma generate                    # Generate Prisma client → src/generated/
npx prisma migrate dev                 # Create/apply a migration (dev)
npx prisma migrate deploy              # Apply pending migrations (prod)
npx prisma studio                      # Browse DB via GUI
npm run db:seed                        # Seed DB (creates admin user)
npm run db:reset                       # Drop + recreate + seed

# ── Queue Management ──
npx bullmq-dashboard                   # View/manage BullMQ queues (if installed)
```

## Quick Start (New Project)

```bash
# 1. Copy and edit environment
cp .env.example .env
# MUST set: ENCRYPTION_SECRET (32 hex chars), Google OAuth, SMTP

# With Docker (recommended):
docker compose up -d
open http://localhost:3000

# OR without Docker:
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev          # Terminal 1
npm run worker       # Terminal 2
```

## Architecture Overview

### How the pieces connect

```
Browser ──HTTP──► Next.js (App Router) ──► Prisma ──► PostgreSQL
   │                    │                      │
   │              Socket.IO ◄── Redis ──► BullMQ Worker
   │                    │           │
   ▼                    ▼           ▼
  Client             Real-time    Background Jobs
  (JS)               updates      (email, todo processing)
```

### Authentication Flow

1. **Login options**: Email/password (JWT), Google SSO, Magic Link
2. **JWT** is stored in an httpOnly cookie (not localStorage). The `withAuth` / `withRoles` wrappers decode and verify on every API request.
3. **User status matters**: New users default to `PENDING` status. They cannot access the app until an ADMIN approves them (`UserStatus.PENDING → ACTIVE`). The `pending/` page shows while waiting.
4. **Role-based guards**: `withRoles(request, [WebUserRole.ADMIN], handler)` — two roles exist: `USER` and `ADMIN`.
5. **Registration**: New signups trigger: audit log, email notification to admins, event bus `access:changed` publish.

### Real-time Events (Socket.IO)

- The custom `server.js` (NOT Next.js's default) attaches Socket.IO to the HTTP server.
- Server publishes via `eventBus` → Redis pub/sub → `socket-server.ts` subscribes and forwards to connected clients.
- Worker also publishes events (overdue reminders, stats) via the same Redis bridge.
- Every event has a typed contract in `src/lib/channel-types.ts`. Add new events there first.
- Event publishing is **best-effort**: errors are logged but never thrown.

### Background Jobs (BullMQ)

| Queue | Purpose | Worker |
|-------|---------|--------|
| `todo-processing` | Todo CRUD side-effects | `src/worker/process-todo.ts` |
| `email-jobs` | Send emails (magic link, notifications, quota warnings) | `src/worker/process-email.ts` |
| `export-jobs` | Data exports | handled in `src/worker/index.ts` |

- Queues defined in `src/lib/queue.ts` with default retry (5 attempts, exponential backoff).
- Workers live in `src/worker/` and run as a separate process (`npm run worker`).
- API routes enqueue jobs and return immediately — never do expensive work inline.

### i18n

- `next-intl` with cookie-based locale (`NEXT_LOCALE`). No `[locale]` dynamic segment needed — `getLocale()` from the plugin handles it.
- Messages in `messages/en.json` (400+ keys) and `messages/th.json`.
- Switch locale by setting cookie + PATCH `/api/user/locale`.
- Always add new keys to **both** language files.

### Theme System

- 42 themes defined in `src/lib/theme-catalog.ts` with CSS variables in `src/app/themes.css`.
- Light/dark/system color modes supported.
- Preferences stored in localStorage (FOUC prevention) and synced to user DB for cross-device persistence.
- `ThemeScript` in `<head>` reads localStorage before React hydrates to prevent flash.

### Quota System

- Per-user limits on: todos count, file count, storage bytes.
- Soft check: `checkUserQuota(userId, 'todos')` returns `{ allowed, used, limit, remaining }`.
- Hard check: `enforceUserQuota(userId, 'files')` throws on exceed.
- Quota warnings sent via email when user approaches limit.

## Project Structure (Key Files)

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               #   Login, Google OAuth, magic link, verify, logout
│   │   ├── todos/              #   Todo CRUD + file attachment
│   │   ├── dashboard/          #   Dashboard data aggregation
│   │   ├── admin/              #   User mgmt, audit log, queues, health
│   │   └── user/               #   Profile, preferences, locale, storage
│   ├── (app)/                  # Authenticated pages (protected by middleware)
│   │   ├── admin/              #   Admin panel pages
│   │   ├── dashboard/          #   Charts, metrics, upcoming deadlines
│   │   ├── todos/              #   Todo list with CRUD UI
│   │   ├── profile/            #   User profile
│   │   └── settings/           #   Preferences, theme, locale
│   ├── (auth)/login/           # Login page (public)
│   ├── pending/                # Pending approval page
│   ├── layout.tsx              # Root layout (i18n, theme, providers)
│   ├── page.tsx                # Landing page (redirects to dashboard or login)
│   ├── globals.css             # Tailwind base
│   └── themes.css              # 42 themes as CSS vars
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── layout/                 # App shell, sidebar, navbar, theme picker, lang toggle
│   ├── providers/              # ThemeProvider, SocketProvider, ThemeScript, ThemeInitializer
│   ├── landing/                # Landing page sections
│   └── dashboard/              # Charts, metric cards, etc.
├── lib/
│   ├── auth.ts                 # JWT auth + withAuth/withRoles guards
│   ├── route-guard.ts          # parseBody(), handleRouteError()
│   ├── event-bus.ts            # Redis pub/sub publisher (eventBus.todoCreated, etc.)
│   ├── socket-server.ts        # Socket.IO server init + Redis subscriber
│   ├── channel-types.ts        # Typed event contracts (START HERE for new events)
│   ├── queue.ts                # BullMQ queue definitions
│   ├── audit.ts                # Audit logging helpers
│   ├── audit-constants.ts      # Audit action constants (client-safe)
│   ├── encryption.ts           # AES-256-GCM encrypt/decrypt, hash, token generation
│   ├── email.ts                # Nodemailer + branded HTML templates
│   ├── quota.ts                # Per-user quota enforcement
│   ├── theme-catalog.ts        # 42 theme definitions
│   ├── prisma.ts               # Prisma singleton (Pg adapter + pool)
│   ├── redis.ts                # Redis singleton (ioredis)
│   ├── dashboard.ts            # Dashboard data aggregation
│   ├── storage/                # Pluggable storage (local adapter, extensible to S3)
│   ├── google-oauth.ts         # Google OAuth flow
│   ├── magic-link.ts           # Magic link token verification
│   └── utils.ts                # cn(), formatDate()
├── worker/
│   ├── index.ts                # Worker entry point (starts all workers)
│   ├── process-todo.ts         # Todo processing worker
│   └── process-email.ts        # Email sending worker
├── __tests__/                  # Unit tests (*.test.ts) + integration tests (*.integration.test.ts)
└── test-setup.ts               # Vitest setup (global mocks for Next.js, Socket.IO)

prisma/
├── schema.prisma               # Models: WebUser, Todo, AuditLog, FileAttachment, etc.
├── seed.ts                     # Seeds admin user
└── migrations/

messages/
├── en.json                     # English (400+ keys)
└── th.json                     # Thai
```

## Critical Gotchas (Will Break)

These WILL cause confusing errors if missed. Read this section before anything else.

### Prisma Client Output Path
The Prisma client is generated to `src/generated/` (NOT `node_modules/.prisma`). Import from `@/generated/client`, not `@prisma/client`. This is set in `prisma/schema.prisma` via `output = "../src/generated"`.

### ENCRYPTION_SECRET Must Be 32 Hex Characters
The AES-256-GCM encryption expects exactly a 32-character hex string (16 bytes). If you set it to anything else, encryption/decryption will fail silently or throw. Generate one with:
```bash
openssl rand -hex 16
```

### Custom server.js Required for Socket.IO
Do NOT use the default Next.js standalone server in production. The custom `server.js` creates an HTTP server, attaches Socket.IO, and forwards HTTP to Next.js's request handler. The Docker production stage runs `CMD ["node", "server.js"]`. In development, `next dev` works fine because Socket.IO is only attached in the server.

### Worker Runs Separately
The BullMQ worker is a completely separate Node process. It:
- Does NOT serve HTTP
- Does NOT use the Next.js router
- Connects to Redis and PostgreSQL directly
- Must be started separately (`npm run worker` or the `worker` Docker service)

### Socket.IO + Standalone Build
In Docker production builds, `socket-server.ts` is pre-compiled to an ESM bundle via esbuild (see Dockerfile). The standalone output doesn't trace Socket.IO dependencies because it's imported from `server.js`, not from Next.js code. Socket.IO and its transitive deps must be manually COPY'd in the Dockerfile.

### Test File Split
- `*.test.ts` → runs under `vitest.config.ts` (happy-dom environment, browser-like)
- `*.integration.test.ts` → runs under `vitest.integration.config.ts` (node environment)
- Both use `@/` path aliases via `vite-tsconfig-paths`

### Route Guard Error Handling
`parseBody()` returns `{ body, error }` — always check for error before using body. `handleRouteError()` maps: `AuthenticationError` → 401, `AuthorizationError` → 403, `NotFoundError` → 404, generic `Error` → 500.

### Event Bus Is Best-Effort
Publishing via eventBus logs errors but never throws. Do not rely on it for critical data — it's a notification layer only.

## Key Patterns

### API Route Pattern (Guarded)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRoles } from '@/lib/auth'
import { parseBody, handleRouteError } from '@/lib/route-guard'
import { WebUserRole } from '@/generated/client'

// Authenticated endpoint
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    return NextResponse.json({ userId: user.userId })
  })
}

// Admin-only endpoint
export async function POST(request: NextRequest) {
  try {
    return await withRoles(request, [WebUserRole.ADMIN], async (user) => {
      const { body, error } = await parseBody<{ title: string }>(request)
      if (error) return error
      return NextResponse.json({ success: true })
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
```

### Adding a New Real-time Event

Four files to touch, in order:

1. **`src/lib/channel-types.ts`** — Add channel constant + payload type
2. **`src/lib/event-bus.ts`** — Add publisher method that publishes to Redis channel
3. **`src/lib/socket-server.ts`** — Add subscriber handler that forwards to Socket.IO rooms
4. **Client** — `useSocketEvent('event:name', handler)` in SocketProvider

### Background Job Pattern

```typescript
// src/lib/queue.ts — Define queue
export const todoProcessingQueue = new Queue('todo-processing', {
  connection: getRedisConnection(),
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } },
})

// API route — Enqueue
await todoProcessingQueue.add('todo-created', { todoId: '123', action: 'created' } as TodoProcessingJobData)

// src/worker/process-todo.ts — Process
const worker = new Worker('todo-processing', async (job) => {
  // job.data has your typed payload
}, { connection: getRedisConnection() })
```

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

### Audit Logging Pattern

```typescript
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

await logAuditEvent({
  userId: user.userId,
  action: AUDIT_ACTIONS.TODO_CREATED, // or TODO_UPDATED, TODO_DELETED, USER_APPROVED, etc.
  entityType: 'todo',
  entityId: todo.id,
  details: { title: todo.title },
})
```

### Quota Check Pattern

```typescript
import { checkUserQuota, enforceUserQuota, getStorageUsage } from '@/lib/quota'

// Soft check
const check = await checkUserQuota(userId, 'todos')
if (!check.allowed) return NextResponse.json({ error: 'Quota exceeded' }, { status: 413 })

// Hard check (throws)
await enforceUserQuota(userId, 'files')

// Storage usage
const { usedBytes, quotaBytes } = await getStorageUsage(userId)
```

### i18n Pattern

```typescript
// Server component
import { useTranslations } from 'next-intl'
const t = useTranslations('todos')
return <h1>{t('title')}</h1>

// Client component — same import, just add 'use client'
'use client'
import { useTranslations } from 'next-intl'

// Switch locale (from LanguageToggle)
document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000`
await fetch('/api/user/locale', { method: 'PATCH', body: JSON.stringify({ locale: 'en' }) })
```

### Storage Pattern

```typescript
import { getStorageAdapter } from '@/lib/storage'
const storage = getStorageAdapter()
await storage.upload('users/abc/avatar.png', buffer)
await storage.download(key)
await storage.exists(key)
await storage.getUrl(key)
await storage.delete(key)
```

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Next.js (dev or prod with custom server.js + Socket.IO) |
| worker | - | BullMQ background job processor |
| postgres | 5442 | PostgreSQL (note: different port from .env default 5440) |
| redis | 6388 | Redis for queues and pub/sub (different from .env default 6386) |

Note: Docker compose uses ports 5442/6388 internally, while `docker-compose.yml` and `.env.example` may reference different port defaults for local-only development.

## Infra: nginx + GitLab CI

- `nginx/app.conf` — sample reverse-proxy config (HTTP proxy + `/socket.io/`
  WebSocket upgrade). Install on the host, set `server_name`, add TLS via
  certbot. See `nginx/README.md`.
- `.gitlab-ci.yml` — builds the `runner` (app) and `worker` Dockerfile targets,
  tags `${CI_COMMIT_SHORT_SHA}` + `latest`, pushes to GitLab's built-in
  registry (`$CI_REGISTRY_IMAGE`). Runs on `main`. Replace the image names
  (`boilerplate-app`, `boilerplate-worker`) when cloning.

## Testing Conventions

- **Unit tests** (`*.test.ts`): happy-dom environment, test components, hooks, lib functions
- **Integration tests** (`*.integration.test.ts`): node environment, test API routes with DB
- Both configs use `@/` path aliases — no relative imports needed
- Test files live alongside their source in `src/__tests__/`
- Run a single file: `npm run test src/__tests__/MyFile.test.ts`

## Docker Build Architecture

The Dockerfile has 5 stages: `base` → `deps` → `dev` → `builder` → `runner`.

Key details for the production build:
- `next.config.ts` sets `output: 'standalone'`
- The `builder` stage extracts `standalone-config.json` from the built output so `server.js` can configure Next.js without webpack
- `socket-server.ts` is compiled to an ESM bundle via esbuild with `socket.io`, `ioredis`, `pg`, and `@prisma/adapter-pg` as externals
- The `runner` stage manually copies Socket.IO and ioredis transitive dependencies that Next.js's standalone tracer misses
- The `worker` stage is a separate image target — it just runs `src/worker/index.ts`

## What to Customize for a New Project

When using this as a template:

1. **`.env.example`** — Change app name, URLs, secrets. Generate a real `ENCRYPTION_SECRET`.
2. **`package.json`** — Update `name`, `version`, description.
3. **`docker-compose.yml`** — Change service names, container names, exposed ports, DB names, env vars.
4. **`messages/`** — Add your own translation files (keep `en.json` as reference).
5. **Prisma schema** — Add your own models. Run `npx prisma migrate dev` for the first migration.
6. **Theme catalog** — Replace or trim `THEME_CATALOG` in `src/lib/theme-catalog.ts`.
7. **`server.js`** — The app name in startup logs.
8. **`src/app/themes.css`** — Replace with your brand colors, or keep the 42 themes.
9. **Email templates** — Update `brandedEmailWrapper()` in `src/lib/email.ts` with your brand.
10. **Landing page** — Replace `src/components/landing/` with your own sections.
11. **Font** — Change the Google Font import in the root layout.
12. **Quota limits** — Adjust defaults in `src/lib/quota.ts` and `prisma/seed.ts`.
