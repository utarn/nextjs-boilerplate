import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { verifyToken } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'
import type { RecentTodo, UpcomingDeadline } from '@/lib/dashboard'
import { LiveDashboardUpdater } from '@/components/dashboard/LiveDashboardUpdater'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { StatusDonutChart } from '@/components/dashboard/status-donut-chart'
import {
  ListTodo,
  Clock,
  BarChart3,
  CheckSquare,
  Users,
  UserCheck,
  UserPlus,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react'
import type { TodoStatus } from '@/generated/client'

// ---------------------------------------------------------------------------
// Metric Card Component — TailAdmin pattern
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <h4 className="mt-3 text-3xl font-bold text-foreground tabular-nums">
          {value.toLocaleString()}
        </h4>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE_VARIANTS: Record<TodoStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
}

// ---------------------------------------------------------------------------
// Relative time helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string, now: Date, t: (key: string, values?: Record<string, string | number | Date>) => string): string {
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return t('justNow')
  if (diffMinutes < 60) return t('minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  if (diffDays < 30) return t('daysAgo', { count: diffDays })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDueDate(dateStr: string, now: Date, t: (key: string, values?: Record<string, string | number | Date>) => string): { text: string; isOverdue: boolean } {
  const dueDate = new Date(dateStr)
  const diffMs = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { text: t('overdueBy', { count: Math.abs(diffDays) }), isOverdue: true }
  }
  if (diffDays === 0) {
    return { text: t('dueToday'), isOverdue: false }
  }
  if (diffDays === 1) {
    return { text: t('dueTomorrow'), isOverdue: false }
  }
  return { text: t('dueIn', { count: diffDays }), isOverdue: false }
}

// ---------------------------------------------------------------------------
// Status badge label helper
// ---------------------------------------------------------------------------

function statusLabel(status: TodoStatus, st: (key: string) => string): string {
  const map: Record<TodoStatus, string> = {
    PENDING: 'pending',
    IN_PROGRESS: 'inProgress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }
  return st(map[status])
}

// ---------------------------------------------------------------------------
// Main Dashboard Page (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    redirect('/login')
  }

  const data = await getDashboardData(payload.userId, payload.role)
  const t = await getTranslations('Dashboard')
  const st = await getTranslations('todos')

  const isAdmin = payload.role === 'ADMIN'
  const now = new Date()

  return (
    <div className="space-y-8">
      <LiveDashboardUpdater />

      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* 4 Metric cards — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ListTodo}
          label={t('total')}
          value={data.metrics.total}
        />
        <MetricCard
          icon={Clock}
          label={t('pending')}
          value={data.metrics.pending}
        />
        <MetricCard
          icon={BarChart3}
          label={t('inProgress')}
          value={data.metrics.inProgress}
        />
        <MetricCard
          icon={CheckSquare}
          label={t('completed')}
          value={data.metrics.completed}
        />
      </div>

      {/* Two-panel layout: Recent Todos + Upcoming Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Todos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('recentTodos')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTodos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('recentTodosEmpty')}
              </p>
            ) : (
              <div className="space-y-1">
                {data.recentTodos.map((todo) => (
                  <RecentTodoRow
                    key={todo.id}
                    todo={todo}
                    now={now}
                    t={t}
                    st={st}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('upcomingDeadlines')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('upcomingDeadlinesEmpty')}
              </p>
            ) : (
              <div className="space-y-1">
                {data.upcomingDeadlines.map((todo) => (
                  <UpcomingDeadlineRow
                    key={todo.id}
                    todo={todo}
                    now={now}
                    t={t}
                    st={st}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two charts: Activity + Status Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('chartActivityTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart
              data={data.activityData}
              createdLabel={t('chartActivityCreated')}
              completedLabel={t('chartActivityCompleted')}
              emptyMessage={t('chartActivityEmpty')}
            />
          </CardContent>
        </Card>

        {/* Status Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('chartStatusTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonutChart
              data={data.statusDistribution}
              valueLabel={t('chartStatusCount')}
              emptyMessage={t('chartStatusEmpty')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Admin Section — only visible for ADMIN role */}
      {isAdmin && data.admin && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('adminTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('adminSubtitle')}
            </p>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={Users}
              label={t('totalUsers')}
              value={data.admin.userStats.totalUsers}
            />
            <MetricCard
              icon={UserCheck}
              label={t('activeUsers')}
              value={data.admin.userStats.activeUsers}
            />
            <MetricCard
              icon={UserPlus}
              label={t('newUsersThisWeek')}
              value={data.admin.userStats.newUsersThisWeek}
            />
          </div>

          {/* Completion Rate + System Health */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {t('completionRate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className="text-4xl font-bold tabular-nums"
                    style={{
                      color:
                        data.admin.completionRate >= 50
                          ? 'var(--color-chart-3)'
                          : 'var(--color-destructive)',
                    }}
                  >
                    {data.admin.completionRate}%
                  </div>
                  <div className="flex-1 bg-secondary h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${data.admin.completionRate}%`,
                        backgroundColor:
                          data.admin.completionRate >= 50
                            ? 'var(--color-chart-3)'
                            : 'var(--color-destructive)',
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('completionRateDetail', {
                    completed: data.metrics.completed,
                    total: data.metrics.total,
                  })}
                </p>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <HeartPulse className="size-4 text-primary" />
                  {t('systemHealth')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <HealthRow
                    label={t('database')}
                    status={data.admin.systemHealth.database}
                    t={t}
                  />
                  <HealthRow
                    label={t('redis')}
                    status={data.admin.systemHealth.redis}
                    t={t}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecentTodoRow({
  todo,
  now,
  t,
  st,
}: {
  todo: RecentTodo
  now: Date
  t: (key: string, values?: Record<string, string | number | Date>) => string
  st: (key: string) => string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{todo.title}</p>
      </div>
      <Badge variant={STATUS_BADGE_VARIANTS[todo.status as TodoStatus]}>
        {statusLabel(todo.status as TodoStatus, st)}
      </Badge>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formatRelativeTime(todo.createdAt, now, t)}
      </span>
    </div>
  )
}

function UpcomingDeadlineRow({
  todo,
  now,
  t,
  st,
}: {
  todo: UpcomingDeadline
  now: Date
  t: (key: string, values?: Record<string, string | number | Date>) => string
  st: (key: string) => string
}) {
  const { text, isOverdue } = formatDueDate(todo.dueDate, now, t)

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isOverdue
          ? 'bg-destructive/5 hover:bg-destructive/10'
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isOverdue ? 'text-destructive' : ''
          }`}
        >
          {todo.title}
        </p>
      </div>
      <Badge variant={STATUS_BADGE_VARIANTS[todo.status as TodoStatus]}>
        {statusLabel(todo.status as TodoStatus, st)}
      </Badge>
      <span
        className={`text-xs whitespace-nowrap shrink-0 ${
          isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
        }`}
      >
        {text}
      </span>
    </div>
  )
}

function HealthRow({
  label,
  status,
  t,
}: {
  label: string
  status: 'healthy' | 'degraded' | 'down'
  t: (key: string, values?: Record<string, string | number | Date>) => string
}) {
  const statusColorMap: Record<string, string> = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    down: 'text-destructive',
  }

  const dotColorMap: Record<string, string> = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-destructive',
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${dotColorMap[status]}`} />
        <span className={`text-sm capitalize ${statusColorMap[status]}`}>
          {t(status === 'healthy' ? 'healthy' : status)}
        </span>
      </div>
    </div>
  )
}
