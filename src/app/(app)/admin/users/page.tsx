'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebUser {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  createdAt: string
}

interface UsersResponse {
  users: WebUser[]
  total: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  ACTIVE:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  INACTIVE:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  USER:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
}

const TAB_VALUES = ['all', 'PENDING', 'ACTIVE', 'INACTIVE'] as const
type TabValue = (typeof TAB_VALUES)[number]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const [users, setUsers] = useState<WebUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Data fetching — always fetch all users, filter client-side
  // -----------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch users (${res.status})`)
      }

      const data: UsersResponse = await res.json()
      setUsers(data.users)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load users',
      )
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // -----------------------------------------------------------------------
  // Client-side filtering
  // -----------------------------------------------------------------------

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all') return users
    return users.filter((u) => u.status === activeTab)
  }, [users, activeTab])

  // -----------------------------------------------------------------------
  // Tab counts
  // -----------------------------------------------------------------------

  const tabCounts = useMemo(() => {
    let all = 0
    let pending = 0
    let active = 0
    let inactive = 0
    for (const u of users) {
      all++
      if (u.status === 'PENDING') pending++
      else if (u.status === 'ACTIVE') active++
      else if (u.status === 'INACTIVE') inactive++
    }
    return { all, PENDING: pending, ACTIVE: active, INACTIVE: inactive }
  }, [users])

  // -----------------------------------------------------------------------
  // Actions — approve / reject / activate / deactivate
  // -----------------------------------------------------------------------

  const updateUserStatus = useCallback(
    async (
      userId: string,
      action: 'approve' | 'reject' | 'activate' | 'deactivate',
    ) => {
      setActionLoading(userId)

      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Action failed (${res.status})`)
        }

        await fetchUsers()
      } catch (err) {
        console.error(`Failed to ${action} user ${userId}:`, err)
        alert(
          err instanceof Error
            ? err.message
            : `Failed to ${action} user`,
        )
      } finally {
        setActionLoading(null)
      }
    },
    [fetchUsers],
  )

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderActions = (user: WebUser) => {
    const isLoading = actionLoading === user.id

    switch (user.status) {
      case 'PENDING':
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={isLoading}
              onClick={() => updateUserStatus(user.id, 'approve')}
              title="Approve user"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isLoading}
              onClick={() => updateUserStatus(user.id, 'reject')}
              title="Reject user"
            >
              <UserX className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )

      case 'ACTIVE':
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => updateUserStatus(user.id, 'deactivate')}
              title="Deactivate user"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-1" />
              )}
              Deactivate
            </Button>
          </div>
        )

      case 'INACTIVE':
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={isLoading}
              onClick={() => updateUserStatus(user.id, 'activate')}
              title="Activate user"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1" />
              )}
              Activate
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  const renderTable = (rows: WebUser[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.email}
                </TableCell>
                <TableCell>{user.displayName}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={ROLE_COLORS[user.role] || ''}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[user.status] || ''}
                  >
                    {STATUS_LABELS[user.status] || user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(user)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border rounded-md"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  All{' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tabCounts.all})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="PENDING">
                  Pending{' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tabCounts.PENDING})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="ACTIVE">
                  Active{' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tabCounts.ACTIVE})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="INACTIVE">
                  Inactive{' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tabCounts.INACTIVE})
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {/* Loading state */}
            {loading && !error && renderSkeleton()}

            {/* Data state */}
            {!loading && !error && (
              <>
                {TAB_VALUES.map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    {renderTable(
                      tab === activeTab ? filteredUsers : [],
                    )}
                  </TabsContent>
                ))}
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
