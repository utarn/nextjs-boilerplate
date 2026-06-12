# Feature Checklist

Complete inventory of all features in this boilerplate, grouped by area. Each feature includes its status and a brief description.

## Authentication

| Feature | Status | Description |
|---------|--------|-------------|
| JWT httpOnly cookies | Done | Auth tokens stored in secure, httpOnly cookies with 24h expiry |
| Google SSO | Done | OAuth 2.0 flow with Google, auto-creates accounts on first login |
| Magic link email | Done | Passwordless sign-in via email with 15-minute expiry tokens |
| Role-based authorization | Done | USER and ADMIN roles with `withAuth` / `withRoles` guards |
| Session verification | Done | JWT verification + DB status check on every request |
| Auth cookie management | Done | Unified `setAuthCookie`, `clearAuthCookie`, `createAuthSession` |
| Route guard utilities | Done | `parseBody` + `handleRouteError` for safe, typed API routes |
| Account status flow | Done | ACTIVE / INACTIVE / PENDING with redirect to pending page |
| Logout | Done | Clears auth cookie and redirects to home |

## Theme System

| Feature | Status | Description |
|---------|--------|-------------|
| 42 handcrafted themes | Done | Diverse themes across 8 categories in theme catalog |
| Light / Dark / System modes | Done | Three color modes with system media query listener |
| FOUC prevention | Done | Inline `<script>` via `next/script` `beforeInteractive` |
| Server-side initial values | Done | DB-stored preferences passed as server props to ThemeProvider |
| Cross-device persistence | Done | Preferences synced to server DB via PATCH /api/user/preferences |
| localStorage fallback | Done | Theme/mode stored in localStorage for unauthenticated users |
| Theme catalog validation | Done | `isValidThemeKey()` and `isValidColorMode()` validators |
| Theme picker dropdown | Done | Category-grouped theme selector with color swatches |
| Color mode cycle toggle | Done | Button cycles through system-light-dark modes |
| Dark class on `<html>` | Done | Tailwind `dark:` variant support via `.dark` class |

## Landing Page

| Feature | Status | Description |
|---------|--------|-------------|
| Hero section | Done | Headline, subtitle, dual CTAs, stats display |
| Features section | Done | 6 feature cards with icons and descriptions |
| Value propositions | Done | 3 value prop cards (organization, search, security) |
| How it works section | Done | 3-step guide to getting started |
| Target audience section | Done | 4 audience segments (professionals, students, teams, personal) |
| Credits section | Done | Technology stack attribution |
| Responsive landing navbar | Done | Sticky nav with smooth scroll, mobile hamburger menu |
| Authenticated redirect | Done | Logged-in users redirected to dashboard automatically |
| Thai font support | Done | Prompt font loaded via next/font for Thai language |

## Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| Metrics cards | Done | Total, Pending, In Progress, Completed counts |
| Recent todos list | Done | Last 5 todos with status and creation date |
| Upcoming deadlines | Done | Sorted deadlines with overdue detection |
| Activity chart (30-day) | Done | Bar/line chart showing created vs completed per day |
| Status distribution chart | Done | Donut chart with theme-aware colors |
| Admin overview panel | Done | User stats, completion rate, system health status |
| Real-time live updates | Done | `LiveDashboardUpdater` listens for `dashboard:stats` events |
| Server-side data aggregation | Done | `getDashboardData()` with parallel Prisma queries |

## Todos

| Feature | Status | Description |
|---------|--------|-------------|
| Full CRUD | Done | Create, read, update, delete with API routes |
| 4 priority levels | Done | LOW, MEDIUM, HIGH, URGENT |
| 4 statuses | Done | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| Due dates | Done | Date picker with overdue detection |
| File attachments | Done | Upload via multipart form or JSON, stored via StorageAdapter |
| Background processing | Done | Todo creation enqueues BullMQ job for stats recalculation |
| Real-time events | Done | Todo CRUD publishes to Redis pub/sub |
| Audit logging | Done | Every state change logged to audit trail |
| Quota enforcement | Done | Per-user limits on todos, files, and storage |
| Storage quota warnings | Done | Automatic email when approaching storage limit |

## Internationalization (i18n)

| Feature | Status | Description |
|---------|--------|-------------|
| next-intl integration | Done | Full i18n with `useTranslations` hook |
| English + Thai | Done | Complete translations for both locales (400+ keys) |
| Cookie-based locale | Done | `NEXT_LOCALE` cookie, no URL path segments |
| Server locale sync | Done | PATCH /api/user/locale persists to DB |
| Language toggle | Done | Dropdown in sidebar with flag icons |
| Translation namespaces | Done | Organized by feature (Login, nav, todos, Dashboard, Admin, email, themes, Landing) |
| Pluralization support | Done | ICU MessageFormat for plurals in email/Admin translations |

## Background Jobs

| Feature | Status | Description |
|---------|--------|-------------|
| BullMQ queue setup | Done | 3 queues: todo-processing, email-jobs, export-jobs |
| Separate worker process | Done | `npm run worker` runs as independent Node.js process |
| Todo processing worker | Done | Handles created/completed/overdue actions |
| Email sending worker | Done | Processes queued email jobs |
| Overdue reminder scheduling | Done | Hourly recurring job checks for overdue todos |
| Exponential backoff | Done | Configurable retry with exponential backoff per queue |
| Graceful shutdown | Done | SIGTERM/SIGINT handler closes workers cleanly |
| Dashboard stats recalculation | Done | Worker publishes updated stats via event bus after todo changes |

## Real-Time (Socket.IO)

| Feature | Status | Description |
|---------|--------|-------------|
| Socket.IO server | Done | Custom `server.js` attaches Socket.IO to HTTP server |
| Redis pub/sub bridge | Done | Redis subscriber forwards events to Socket.IO rooms |
| JWT auth on connect | Done | Auth middleware verifies cookie + DB status on every connection |
| User-specific rooms | Done | Each user joins `user:{userId}` room for targeted events |
| Admin room | Done | ADMIN users join `admin:room` for broadcast messages |
| User invalidation | Done | `user:invalidate` event force-disconnects user sockets |
| Access change handling | Done | `access:changed` event recomputes room subscriptions without disconnect |
| Client provider | Done | `SocketProvider` with connection state management |
| Event hook | Done | `useSocketEvent<T>(event, callback)` with auto cleanup |
| Connection status indicator | Done | Colored dot + label (hidden when connected) |

## Admin Panel

| Feature | Status | Description |
|---------|--------|-------------|
| User management | Done | List, search, approve, reject, activate, deactivate users |
| Queue management | Done | View jobs by status, retry failed, cancel waiting jobs |
| Audit log viewer | Done | Paginated, filterable audit trail with details expansion |
| System health page | Done | DB/Redis health, queue stats, latency monitoring |
| Admin-only guards | Done | All admin routes protected by `withRoles([WebUserRole.ADMIN])` |

## Storage

| Feature | Status | Description |
|---------|--------|-------------|
| Pluggable adapter interface | Done | `StorageAdapter` interface with upload/download/delete/getUrl/exists |
| Local filesystem adapter | Done | Files stored in `./storage/` directory |
| Factory pattern | Done | `getStorageAdapter()` returns configured adapter by `STORAGE_TYPE` |
| File attachment support | Done | Todos can include file attachments stored via adapter |

## Email

| Feature | Status | Description |
|---------|--------|-------------|
| SMTP transport | Done | Lazy singleton with configurable host/port/auth/SSL |
| Branded email wrapper | Done | Responsive HTML template with header, body, footer |
| Magic link email | Done | CTA button email with 15-min expiry notice |
| New user notification to admins | Done | Sends to all ACTIVE ADMIN users on signup |
| Account approved/rejected emails | Done | Branded notification of account status changes |
| Quota warning email | Done | Storage usage details with remaining space |
| Overdue reminder email | Done | Per-user email with list of overdue todos |
| Queue-based email sending | Done | Email jobs processed by BullMQ worker (fire-and-forget) |

## Docker

| Feature | Status | Description |
|---------|--------|-------------|
| Multi-stage Dockerfile | Done | Build + production stages with standalone output |
| docker-compose.yml | Done | App, worker, PostgreSQL, Redis services |
| Custom server.js | Done | HTTP server with Socket.IO (standalone-compatible) |
| Esbuild bundle for Socket.IO | Done | Pre-compiled ESM bundle for production Docker build |
| Health checks | Done | Docker health check endpoints for all services |
| Instrumentation hook | Done | Auto-applies Prisma migrations on server start |

## Utilities

| Feature | Status | Description |
|---------|--------|-------------|
| AES-256-GCM encryption | Done | Encrypt/decrypt/hash/generateRandomToken |
| Audit logging | Done | Structured audit events with action/entity/detail |
| Quota management | Done | Per-user limits with soft and hard enforcement |
| Tailwind class merging | Done | `cn()` utility combining `clsx` + `tailwind-merge` |
| Date formatting | Done | `formatDate()` and `formatDateTime()` helpers |
| Redis connection config | Done | `getRedisConnection()` parses REDIS_URL for BullMQ/ioredis |
| App URL helper | Done | `appUrl()` builds absolute URLs from config or request |

## Testing

| Feature | Status | Description |
|---------|--------|-------------|
| Vitest configuration | Done | Happy DOM environment with path alias support |
| Unit tests for auth | Done | JWT generation, verification, cookie handling |
| Unit tests for todos | Done | CRUD operations, file attachment |
| Unit tests for dashboard | Done | Data aggregation, metric calculations |
| Unit tests for landing page | Done | Section rendering, responsive image |
| Unit tests for login page | Done | Form validation, error states |
| Unit tests for storage | Done | Local adapter CRUD operations |
| Unit tests for encryption | Done | Encrypt/decrypt round-trip, hash, token generation |
| Unit tests for quota | Done | Usage calculation, limit enforcement |
| Unit tests for event bus | Done | Publish/subscribe channel routing |
| Unit tests for API routes | Done | Admin queues, user profile, auth endpoints |
| Unit tests for ThemeProvider | Done | Context values, apply effects |
| Unit tests for magic link | Done | Token generation, verification, expiry |
| Unit tests for Google OAuth | Done | URL generation, token exchange |
| Unit tests for workers | Done | Todo processing, email sending |
| Integration test config | Done | Separate vitest config for integration tests |

## Documentation

| Feature | Status | Description |
|---------|--------|-------------|
| CLAUDE.md | Done | Comprehensive project documentation with patterns and guides |
| FEATURES.md | Done | Complete feature checklist grouped by area |
| JSDoc @example blocks | Done | Key exports documented with usage examples |
| .env.example | Done | All required environment variables documented |
