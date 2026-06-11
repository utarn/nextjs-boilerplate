import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { useTranslations } from 'next-intl'
import { CheckSquare, ListTodo, Clock, BarChart3, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Dashboard — server component with real Prisma queries
// ---------------------------------------------------------------------------

async function getDashboardStats(userId: string) {
  const stats = await prisma.todo.groupBy({
    by: ['status'],
    where: { userId },
    _count: { id: true },
  })

  const total = stats.reduce((sum, s) => sum + s._count.id, 0)
  const pending = stats.find((s) => s.status === 'PENDING')?._count.id ?? 0
  const inProgress = stats.find((s) => s.status === 'IN_PROGRESS')?._count.id ?? 0
  const completed = stats.find((s) => s.status === 'COMPLETED')?._count.id ?? 0
  const cancelled = stats.find((s) => s.status === 'CANCELLED')?._count.id ?? 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Count overdue todos (past due date, not completed/cancelled)
  const overdue = await prisma.todo.count({
    where: {
      userId,
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  })

  return { total, pending, inProgress, completed, cancelled, completionRate, overdue }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    redirect('/login')
  }

  const stats = await getDashboardStats(payload.userId)

  return (
    <DashboardContent stats={stats} />
  )
}

// Client-rendered content (for translations)
function DashboardContent({
  stats,
}: {
  stats: {
    total: number
    pending: number
    inProgress: number
    completed: number
    cancelled: number
    completionRate: number
    overdue: number
  }
}) {
  // We use `useTranslations` in a client component normally, but this is
  // fine as an inline server component too. For the boilerplate, plain labels
  // are more readable than wrapping in a client boundary.

  const statCards = [
    {
      title: 'Total Todos',
      value: String(stats.total),
      icon: ListTodo,
      color: 'text-blue-500',
    },
    {
      title: 'Pending',
      value: String(stats.pending),
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'In Progress',
      value: String(stats.inProgress),
      icon: BarChart3,
      color: 'text-indigo-500',
    },
    {
      title: 'Completed',
      value: String(stats.completed),
      icon: CheckSquare,
      color: 'text-green-500',
    },
    {
      title: 'Cancelled',
      value: String(stats.cancelled),
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Overdue',
      value: String(stats.overdue),
      icon: Clock,
      color: 'text-orange-500',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Main stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion rate card */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-500">
                {stats.completionRate}%
              </div>
              <div className="flex-1 bg-secondary h-4 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.completed} of {stats.total} todos completed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
