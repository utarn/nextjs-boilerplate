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

## Features

- **Authentication**: JWT httpOnly cookies, Google SSO, magic link email
- **Internationalization**: next-intl with cookie-based locale (en/th)
- **Background Jobs**: BullMQ queues with separate worker process
- **Real-time**: Socket.IO WebSocket with Redis pub/sub bridge
- **Database**: Prisma ORM with PostgreSQL, migrations, and seeding
- **UI**: shadcn/ui components, dark/light theme, responsive layout
- **Docker**: Multi-stage Dockerfile, docker-compose with all services
- **Testing**: Vitest for unit and integration tests
- **Utilities**: Encryption, audit logging, storage abstraction, quota management

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
│   ├── api/                    # API routes
│   │   ├── admin/queues/       # Queue management endpoints
│   │   ├── auth/               # Auth endpoints (Google, magic link, logout)
│   │   ├── todos/              # Todo CRUD endpoints
│   │   └── user/               # User profile endpoints
│   ├── (app)/                  # Authenticated app pages
│   │   ├── admin/queues/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── todos/
│   ├── (auth)/                 # Unauthenticated auth pages
│   │   └── login/
│   ├── layout.tsx              # Root layout with providers (i18n, theme)
│   ├── page.tsx                # Home page (redirects to dashboard or login)
│   └── globals.css
├── components/
│   ├── layout/                 # App layout, nav, theme picker, language toggle
│   ├── providers/              # Theme, Socket.IO providers
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth.ts                 # JWT auth, withAuth/withRoles guards
│   ├── audit.ts                # Audit logging
│   ├── email.ts                # Nodemailer email sending
│   ├── encryption.ts           # AES-256-GCM encryption
│   ├── event-bus.ts            # Redis pub/sub event bus
│   ├── google-oauth.ts         # Google OAuth flow
│   ├── magic-link.ts           # Magic link auth flow
│   ├── prisma.ts               # Prisma client singleton
│   ├── queue.ts                # BullMQ queue definitions
│   ├── quota.ts                # Quota management
│   ├── redis.ts                # Redis connection singleton
│   ├── socket-server.ts        # Socket.IO server (used in custom server.js)
│   ├── storage/                # Storage abstraction (local adapter)
│   └── utils.ts                # Utility functions
├── worker/
│   ├── index.ts                # Worker entry point
│   ├── process-todo.ts         # Todo processing worker
│   └── process-email.ts        # Email sending worker
├── __tests__/                  # Test files
└── test-setup.ts               # Vitest test setup

prisma/
├── schema.prisma               # Database schema
├── seed.ts                     # Database seeder
└── migrations/                 # Migration history

i18n/
└── request.ts                  # next-intl request config

messages/
├── en.json                     # English translations
└── th.json                     # Thai translations
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

### i18n Translations

```typescript
// Server component
import { useTranslations } from 'next-intl'
const t = useTranslations('todos')
return <h1>{t('title')}</h1>

// Client component
'use client'
import { useTranslations } from 'next-intl'
```

### Real-time Events

```typescript
// Publish from server
import { eventBus } from '@/lib/event-bus'
await eventBus.todoCreated({ userId: '123', todoId: '456', title: 'My todo' })
await eventBus.todoUpdated({ userId: '123', todoId: '456', status: 'COMPLETED' })
await eventBus.todoDeleted({ userId: '123', todoId: '456' })
await eventBus.dashboardStats({ userId: '123', total: 10, pending: 3, inProgress: 2, completed: 5, cancelled: 0 })

// Subscribe in client
import { useSocketEvent } from '@/components/providers/SocketProvider'
useSocketEvent('todo:updated', (data) => {
  console.log('Todo updated:', data)
})
```

Events from the worker (overdue reminders, stats recalculation) use the
same Redis pub/sub bridge — the worker publishes to Redis channels and the
Socket.IO server running inside the Next.js process forwards them to clients.

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
npm run test:coverage     # Coverage report
```

## Extending for a New Project

1. **Add new Prisma models** in `prisma/schema.prisma` → run `npx prisma migrate dev`
2. **Add new API routes** in `src/app/api/`
3. **Add new pages** in `src/app/(app)/`
4. **Add new translations** in `messages/en.json` and `messages/th.json`
5. **Add new queues** in `src/lib/queue.ts` and workers in `src/worker/`
6. **Add new UI components** with `npx shadcn@latest add <component>`

## Notes for AI Agents

- All versions are pinned and tested to work together — do not upgrade without testing
- The `withAuth` / `withRoles` pattern must be used on every authenticated API route
- Background jobs go through BullMQ queues, never run expensive operations in API routes
- The worker process runs separately from the web server in production
- Socket.IO requires the custom `server.js` — do not use the default Next.js server in production
- i18n locale is stored in a cookie (`NEXT_LOCALE`) and managed by next-intl
- Translations are loaded from JSON files in `messages/` — add new keys there
- The root layout uses `getLocale()` from next-intl — no `[locale]` dynamic segment is needed
