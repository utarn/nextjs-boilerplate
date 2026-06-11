import { prisma } from '@/lib/prisma'
import { WebUserRole, TodoStatus } from '@/generated/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface RecentTodo {
  id: string
  title: string
  status: TodoStatus
  dueDate: string | null
  createdAt: string
}

export interface UpcomingDeadline {
  id: string
  title: string
  status: TodoStatus
  dueDate: string
  isOverdue: boolean
}

export interface ActivityDataPoint {
  date: string
  created: number
  completed: number
}

export interface StatusDistribution {
  name: string
  value: number
  fill: string
}

export interface AdminData {
  userStats: {
    totalUsers: number
    activeUsers: number
    newUsersThisWeek: number
  }
  completionRate: number
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down'
    redis: 'healthy' | 'degraded' | 'down'
  }
}

export interface DashboardData {
  metrics: DashboardMetrics
  recentTodos: RecentTodo[]
  upcomingDeadlines: UpcomingDeadline[]
  activityData: ActivityDataPoint[]
  statusDistribution: StatusDistribution[]
  admin?: AdminData
}

// ---------------------------------------------------------------------------
// Chart fill colours for status distribution
// Mapped to CSS custom properties for theme-awareness.
// ---------------------------------------------------------------------------

const STATUS_FILLS: Record<TodoStatus, string> = {
  PENDING: 'var(--color-chart-1)',
  IN_PROGRESS: 'var(--color-chart-2)',
  COMPLETED: 'var(--color-chart-3)',
  CANCELLED: 'var(--color-chart-4)',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date to YYYY-MM-DD string in local timezone. */
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return an array of Date objects for the last N days (including today). */
function lastNDays(n: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d)
  }
  return dates
}

// ---------------------------------------------------------------------------
// getDashboardData — Server-side dashboard data fetcher
// ---------------------------------------------------------------------------

export async function getDashboardData(
  userId: string,
  role: string,
): Promise<DashboardData> {
  const isAdmin = role === WebUserRole.ADMIN

  // Run user-scoped queries in parallel
  const [statusGroup, recentTodos, upcomingDeadlines, createdData, completedData, adminData] =
    await Promise.all([
      // 1. Metric counts grouped by status
      prisma.todo.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),

      // 2. Recent 5 todos
      prisma.todo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, dueDate: true, createdAt: true },
      }),

      // 3. Upcoming deadlines (all non-completed/non-cancelled todos with due dates)
      prisma.todo.findMany({
        where: {
          userId,
          dueDate: { not: null },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: { id: true, title: true, status: true, dueDate: true },
      }),

      // 4. Todos created in the last 30 days (for activity chart)
      prisma.todo.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true, status: true },
      }),

      // 5. Todos that were completed in the last 30 days (for activity chart)
      prisma.todo.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { updatedAt: true },
      }),

      // 6. Admin data (only fetched when ADMIN, resolves quickly otherwise)
      isAdmin ? getAdminData() : Promise.resolve(undefined),
    ])

  // Build metrics
  const total = statusGroup.reduce((sum, s) => sum + s._count.id, 0)
  const pending = statusGroup.find((s) => s.status === 'PENDING')?._count.id ?? 0
  const inProgress = statusGroup.find((s) => s.status === 'IN_PROGRESS')?._count.id ?? 0
  const completed = statusGroup.find((s) => s.status === 'COMPLETED')?._count.id ?? 0
  const cancelled = statusGroup.find((s) => s.status === 'CANCELLED')?._count.id ?? 0

  const metrics: DashboardMetrics = { total, pending, inProgress, completed, cancelled }

  // Map recent todos
  const recentTodosMapped: RecentTodo[] = recentTodos.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }))

  // Map upcoming deadlines with overdue detection
  const now = new Date()
  const upcomingDeadlinesMapped: UpcomingDeadline[] = upcomingDeadlines.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate!.toISOString(),
    isOverdue: t.dueDate! < now,
  }))

  // Build activity data (last 30 days)
  const dateRange = lastNDays(30)

  // Count created per day
  const createdByDay = new Map<string, number>()
  for (const t of createdData) {
    const key = toDateStr(t.createdAt)
    createdByDay.set(key, (createdByDay.get(key) ?? 0) + 1)
  }

  // Count completed per day (approximate by updatedAt)
  const completedByDay = new Map<string, number>()
  for (const t of completedData) {
    const key = toDateStr(t.updatedAt)
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1)
  }

  const activityData: ActivityDataPoint[] = dateRange.map((d) => {
    const key = toDateStr(d)
    return {
      date: key,
      created: createdByDay.get(key) ?? 0,
      completed: completedByDay.get(key) ?? 0,
    }
  })

  // Build status distribution
  const statusDistribution: StatusDistribution[] = [
    { name: 'PENDING', value: pending, fill: STATUS_FILLS.PENDING },
    { name: 'IN_PROGRESS', value: inProgress, fill: STATUS_FILLS.IN_PROGRESS },
    { name: 'COMPLETED', value: completed, fill: STATUS_FILLS.COMPLETED },
    { name: 'CANCELLED', value: cancelled, fill: STATUS_FILLS.CANCELLED },
  ]

  return {
    metrics,
    recentTodos: recentTodosMapped,
    upcomingDeadlines: upcomingDeadlinesMapped,
    activityData,
    statusDistribution,
    admin: adminData,
  }
}

// ---------------------------------------------------------------------------
// Admin data — global stats
// ---------------------------------------------------------------------------

async function getAdminData(): Promise<AdminData> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Count todos for completion rate
  const [totalUsers, activeUsers, newUsersThisWeek, totalTodos, completedTodos] =
    await Promise.all([
      prisma.webUser.count(),
      prisma.webUser.count({ where: { status: 'ACTIVE' } }),
      prisma.webUser.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.todo.count(),
      prisma.todo.count({ where: { status: 'COMPLETED' } }),
    ])

  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

  return {
    userStats: {
      totalUsers,
      activeUsers,
      newUsersThisWeek,
    },
    completionRate,
    systemHealth: {
      database: 'healthy',
      redis: 'healthy',
    },
  }
}
