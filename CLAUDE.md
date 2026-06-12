# Next.js Production Boilerplate

A production-ready Next.js boilerplate template designed for AI agents to learn from and use as a starting point for new projects.

## Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.2.7 |
| UI | React | 19.2.6 |
| Language | TypeScript | 6.x |
| Database | PostgreSQL + Prisma | 7.8.0 |
| Queue | BullMQ + Redis | 5.56.0 |
| i18n | next-intl | 4.13.0 |
| Auth | JWT + Google SSO + Magic Link | jsonwebtoken 9.x |
| UI Library | shadcn/ui + Radix UI | latest |
| CSS | Tailwind CSS | 4.x |
| Real-time | Socket.IO | 4.8.3 |
| Email | Nodemailer | 8.x |
| Testing | Vitest + Happy DOM | 4.x |
| Charts | Recharts | 3.8.0 |
| Icons | Lucide React | 1.17.0 |
| Font | Google Fonts (Prompt) | via next/font |

## Features

- **Authentication**: JWT httpOnly cookies, Google SSO, magic link email
- **Authorization**: Role-based guards (USER / ADMIN) via `withAuth` / `withRoles`
- **Theme System**: 42 handcrafted themes with light/dark/system color modes, persisted to server
- **Landing Page**: Full marketing page with hero, features, value props, how-it-works sections
- **Dashboard**: Charts (activity, status distribution), metrics cards, upcoming deadlines, admin overview
- **Todos**: Full CRUD with file attachments, priorities, due dates, status tracking
- **Internationalization**: next-intl with cookie-based locale (en/th), 400+ translated keys
- **Background Jobs**: BullMQ queues with separate worker process (todo processing, email sending, exports)
- **Real-time**: Socket.IO WebSocket with Redis pub/sub bridge for live updates
- **Admin Panel**: User management (approve/reject/activate/deactivate), queue monitoring, audit log viewer, system health
- **Storage**: Pluggable storage abstraction (local adapter included, extensible to S3/etc.)
- **Email**: Branded email templates for magic links, notifications, quota warnings, overdue reminders
- **Audit Logging**: Structured audit trail for all user and admin actions
- **Quota Management**: Per-user limits on todos, file count, and storage
- **Docker**: Multi-stage Dockerfile, docker-compose with all services
- **Testing**: Vitest for unit and integration tests

## Quick Start

### With Docker (Recommended)

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env with your values (especially ENCRYPTION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

# 2. Start all services
docker compose up -d

# 3. Access the app
open http://localhost:3000
```

### Without Docker

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 4. Seed the database
npm run db:seed

# 5. Start the development server
npm run dev

# 6. In a separate terminal, start the worker
npm run worker
```

## Project Structure

```
src/
├── app/
│   ├── api/                        # API routes
│   │   ├── admin/
│   │   │   ├── audit-log/          # Audit log listing
│   │   │   ├── health/             # System health check
│   │   │   ├── queues/             # Queue management (list, retry, cancel)
│   │   │   └── users/              # User management (list, approve, reject)
│   │   ├── auth/                   # Auth endpoints (Google, magic link, logout, verify)
│   │   ├── todos/                  # Todo CRUD + file attachment
│   │   ├── dashboard/              # Dashboard data
│   │   └── user/                   # User profile, preferences, locale, storage
│   ├── (app)/                      # Authenticated app pages
│   │   ├── admin/
│   │   │   ├── audit-log/
│   │   │   ├── queues/
│   │   │   ├── system/
│   │   │   └── users/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── todos/
│   ├── (auth)/                     # Unauthenticated auth pages
│   │   └── login/
│   ├── pending/                    # Pending approval page
│   ├── layout.tsx                  # Root layout (i18n, theme)
│   ├── page.tsx                    # Landing page (redirects to dashboard or login)
│   ├── globals.css                 # Tailwind base styles
│   └── themes.css                  # Theme CSS variables
├── components/
│   ├── layout/                     # App layout, nav, theme picker, language toggle
│   ├── providers/                  # Theme, Socket.IO providers, ThemeScript, ThemeInitializer
│   ├── ui/                         # shadcn/ui components (button, card, dialog, etc.)
│   ├── landing/                    # Landing page sections (hero, features, etc.)
│   └── dashboard/                  # Dashboard-specific charts and components
├── lib/
│   ├── auth.ts                     # JWT auth, withAuth/withRoles guards
│   ├── audit.ts                    # Audit logging
│   ├── audit-constants.ts          # Audit action/category constants (client-safe)
│   ├── channel-types.ts            # Real-time channel contracts and payload types
│   ├── dashboard.ts                # Dashboard data aggregation
│   ├── email.ts                    # Nodemailer email sending + branded templates
│   ├── encryption.ts               # AES-256-GCM encryption utilities
│   ├── event-bus.ts                # Redis pub/sub event bus
│   ├── google-oauth.ts             # Google OAuth flow helpers
│   ├── magic-link.ts               # Magic link auth flow
│   ├── prisma.ts                   # Prisma client singleton (Pg adapter)
│   ├── queue.ts                    # BullMQ queue definitions
│   ├── queue-management.ts         # Queue job helpers (list, retry, cancel)
│   ├── quota.ts                    # Quota management (todos, files, storage)
│   ├── redis.ts                    # Redis connection singleton
│   ├── route-guard.ts              # Route guard utilities (parseBody, handleRouteError)
│   ├── socket-server.ts            # Socket.IO server with Redis bridge
│   ├── theme-catalog.ts            # Theme catalog data (42 themes) + validators
│   ├── utils.ts                    # Utility functions (cn, formatDate)
│   └── storage/
│       ├── types.ts                # StorageAdapter interface
│       ├── index.ts                # Barrel exports
│       ├── factory.ts              # Storage adapter factory
│       └── local-adapter.ts        # Local filesystem adapter
├── worker/
│   ├── index.ts                    # Worker entry point
│   ├── process-todo.ts             # Todo processing worker
│   └── process-email.ts            # Email sending worker
├── __tests__/                      # Test files
└── test-setup.ts                   # Vitest test setup

prisma/
├── schema.prisma                   # Database schema (WebUser, Todo, AuditLog, etc.)
├── seed.ts                         # Database seeder (creates admin user)
└── migrations/                     # Migration history

i18n/
└── request.ts                      # next-intl request config

messages/
├── en.json                         # English translations (400+ keys)
└── th.json                         # Thai translations
```

## Key Patterns

### Authentication Guard

```typescript
import { withAuth, withRoles } from '@/lib/auth'
import { WebUserRole } from '@/generated/client'

// Require authentication
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    return NextResponse.json({ userId: user.userId })
  })
}

// Require specific role
export async function DELETE(request: NextRequest) {
  return withRoles(request, [WebUserRole.ADMIN], async (user) => {
    return NextResponse.json({ success: true })
  })
}
```

### Route Guard (parseBody + handleRouteError)

```typescript
import { withAuth } from '@/lib/auth'
import { parseBody, handleRouteError } from '@/lib/route-guard'

export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async (user) => {
      // Safely parse JSON body
      const { body, error } = await parseBody<{ title: string }>(request)
      if (error) return error

      // ... do work
      return NextResponse.json({ success: true })
    })
  } catch (err) {
    return handleRouteError(err)  // Maps Auth/NotFound errors to proper status codes
  }
}
```

### Background Jobs

```typescript
import { todoProcessingQueue, TodoProcessingJobData } from '@/lib/queue'

// Enqueue a job
await todoProcessingQueue.add('job-name', {
  todoId: '123',
  action: 'created',
} as TodoProcessingJobData)

// Process in worker (src/worker/)
import { Worker } from 'bullmq'
const worker = new Worker(QUEUE_NAME, async (job) => {
  // Process job
}, { connection: getRedisConnection() })
```

### Real-time Events (Event Bus)

```typescript
// Publish from server
import { eventBus } from '@/lib/event-bus'
await eventBus.todoCreated({ userId: '123', todoId: '456', title: 'My todo' })
await eventBus.todoUpdated({ userId: '123', todoId: '456', status: 'COMPLETED' })
await eventBus.todoDeleted({ userId: '123', todoId: '456' })
await eventBus.dashboardStats({ userId: '123', total: 10, pending: 3, inProgress: 2, completed: 5, cancelled: 0 })
await eventBus.userInvalidate({ userId: '123' })
await eventBus.accessChanged({ userId: '123', newRole: 'ADMIN' })

// Subscribe in client
import { useSocketEvent } from '@/components/providers/SocketProvider'
useSocketEvent('todo:updated', (data) => {
  console.log('Todo updated:', data)
})
```

Events from the worker (overdue reminders, stats recalculation) use the same Redis pub/sub bridge — the worker publishes to Redis channels and the Socket.IO server running inside the Next.js process forwards them to clients.

### Storage Adapter

```typescript
import { getStorageAdapter } from '@/lib/storage'

const storage = getStorageAdapter()

// Upload a file
const key = await storage.upload('users/abc123/avatar.png', buffer)

// Download
const data = await storage.download(key)

// Check existence
const exists = await storage.exists(key)

// Get public URL
const url = await storage.getUrl(key)

// Delete
await storage.delete(key)
```

### Theme System

```typescript
// Server component — pass DB-stored preferences as props
<ThemeProvider defaultTheme={user.theme} defaultColorMode={user.colorMode}>

// Client component — consume theme context
'use client'
import { useTheme } from '@/components/providers/ThemeProvider'

function MyComponent() {
  const { theme, colorMode, isDark, setTheme, setColorMode } = useTheme()

  // Switch theme (persist to server = true)
  setTheme('catppuccin', true)

  // Toggle color mode
  setColorMode('dark', true)
}
```

### i18n Translations

```typescript
// Server component
import { useTranslations } from 'next-intl'
const t = useTranslations('todos')
return <h1>{t('title')}</h1>

// Client component
'use client'
import { useTranslations } from 'next-intl'

// Switch locale (from LanguageToggle component)
document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000`
// Also sync to server: PATCH /api/user/locale
```

### Socket.IO Provider

```tsx
'use client'
import { useSocketEvent, useSocketConnected, useConnectionStatus, useSocket } from '@/components/providers/SocketProvider'

// Listen for an event
useSocketEvent<DashboardStatsPayload>('dashboard:stats', (data) => {
  setStats(data)
})

// Check connection status
const connected = useSocketConnected()
const status = useConnectionStatus() // 'connected' | 'disconnected' | 'reconnecting'

// Get raw socket for emitting custom events
const socket = useSocket()
```

### Audit Logging

```typescript
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

await logAuditEvent({
  userId: user.userId,
  action: AUDIT_ACTIONS.TODO_CREATED,
  entityType: 'todo',
  entityId: todo.id,
  details: { title: todo.title },
})
```

### Quota Management

```typescript
import { checkUserQuota, enforceUserQuota, getStorageUsage } from '@/lib/quota'

// Soft check (returns { allowed, used, limit, remaining })
const check = await checkUserQuota(userId, 'todos')
if (!check.allowed) {
  return NextResponse.json({ error: 'Quota exceeded' }, { status: 413 })
}

// Hard check (throws if exceeded)
await enforceUserQuota(userId, 'files')

// Get storage usage
const { usedBytes, quotaBytes } = await getStorageUsage(userId)
```

### Admin API Routes

```typescript
import { withRoles } from '@/lib/auth'
import { WebUserRole } from '@/generated/client'

export async function GET(request: NextRequest) {
  return withRoles(request, [WebUserRole.ADMIN], async (user) => {
    // Admin-only logic
  })
}
```

### Encryption Utilities

```typescript
import { encrypt, decrypt, hash, generateRandomToken } from '@/lib/encryption'

const encrypted = encrypt('sensitive data')
const decrypted = decrypt(encrypted)
const hashed = hash('data')
const token = generateRandomToken() // 64-char hex string
```

### Email Sending

```typescript
import { sendMagicLinkEmail, sendNewUserNotificationToAdmins, sendAccountApprovedEmail, sendAccountRejectedEmail, sendQuotaWarningEmail, sendOverdueReminderEmail, brandedEmailWrapper, sendEmail } from '@/lib/email'

// Send a plain email
await sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' })

// Send branded magic link
await sendMagicLinkEmail('user@example.com', 'https://app.com/api/auth/verify?token=xxx')

// Notify admins about new signup
await sendNewUserNotificationToAdmins({ userEmail: 'user@example.com', userDisplayName: 'John' })
```

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Next.js web application |
| worker | - | BullMQ background job processor |
| postgres | 5440 | PostgreSQL database |
| redis | 6386 | Redis for queues and pub/sub |

## Testing

```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:integration  # Integration tests
npm run test:all          # Unit + integration
npm run test:coverage     # Coverage report
```

## Extending for a New Project

1. **Add new Prisma models** in `prisma/schema.prisma` -- run `npx prisma migrate dev`
2. **Add new API routes** in `src/app/api/`
3. **Add new pages** in `src/app/(app)/` for authenticated pages, or `src/app/(auth)/` for public auth pages
4. **Add new translations** in `messages/en.json` and `messages/th.json`
5. **Add new queues** in `src/lib/queue.ts` and workers in `src/worker/`
6. **Add new themes** by adding entries to `THEME_CATALOG` in `src/lib/theme-catalog.ts` and CSS variables in `src/app/themes.css`
7. **Add new languages** by creating a new `messages/{locale}.json` file and adding the locale to the language toggle
8. **Add new UI components** with `npx shadcn@latest add <component>`
9. **Add new storage adapters** by implementing `StorageAdapter` interface in `src/lib/storage/` and registering in `factory.ts`
10. **Add new email templates** by creating a new function in `src/lib/email.ts` using `brandedEmailWrapper()`
11. **Add new real-time events** by adding channel constants in `src/lib/channel-types.ts`, publisher methods in `event-bus.ts`, and handlers in `socket-server.ts`

## Notes for AI Agents

- All versions are pinned and tested to work together -- do not upgrade without testing
- The `withAuth` / `withRoles` pattern must be used on every authenticated API route
- Background jobs go through BullMQ queues, never run expensive operations in API routes
- The worker process runs separately from the web server in production
- Socket.IO requires the custom `server.js` -- do not use the default Next.js server in production
- i18n locale is stored in a cookie (`NEXT_LOCALE`) and managed by next-intl
- Translations are loaded from JSON files in `messages/` -- add new keys there
- The root layout uses `getLocale()` from next-intl -- no `[locale]` dynamic segment is needed
- Theme preferences are stored in localStorage for fast FOUC prevention and synced to the server DB for cross-device persistence
- Prisma client is generated to `src/generated/` (not the default `node_modules/.prisma`) -- import from `@/generated/client`
- Database adapter uses `@prisma/adapter-pg` with `pg` pool for PostgreSQL connection pooling
- All event publishing is best-effort -- errors are logged but never thrown to avoid blocking the request pipeline
- Email sending uses fire-and-forget via BullMQ queues -- SMTP failures in API routes must not crash the web server
- The `parseBody` helper returns a discriminated union `{ body, error }` -- always check for error before using body
- The `handleRouteError` helper handles `AuthenticationError` (401), `AuthorizationError` (403), `NotFoundError` (404), and generic `Error` (500)
- Test files use `@/` path aliases via `vite-tsconfig-paths` plugin -- no relative imports needed in tests
