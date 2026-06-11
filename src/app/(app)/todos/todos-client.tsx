'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSocketEvent } from '@/components/providers/SocketProvider'

interface Todo {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_ICON = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
}

const STATUS_COLOR = {
  PENDING: 'text-yellow-500',
  IN_PROGRESS: 'text-blue-500',
  COMPLETED: 'text-green-500',
  CANCELLED: 'text-red-500',
}

export function TodosPageClient() {
  const t = useTranslations('todos')
  const tCommon = useTranslations('common')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos')
      if (res.ok) {
        const data = await res.json()
        setTodos(data)
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Real-time updates via Socket.IO — re-fetch on any change
  useSocketEvent('todo:created', () => {
    fetchTodos()
  })

  useSocketEvent('todo:updated', () => {
    fetchTodos()
  })

  useSocketEvent('todo:deleted', () => {
    fetchTodos()
  })

  const createTodo = async () => {
    if (!newTitle.trim()) return

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          dueDate: newDueDate || undefined,
        }),
      })

      if (res.ok) {
        setNewTitle('')
        setNewDescription('')
        setNewDueDate('')
        setDialogOpen(false)
        fetchTodos()
      }
    } catch (err) {
      console.error('Failed to create todo:', err)
    }
  }

  const updateTodoStatus = async (todoId: string, status: string) => {
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchTodos()
      }
    } catch (err) {
      console.error('Failed to update todo:', err)
    }
  }

  const deleteTodo = async (todoId: string) => {
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchTodos()
      }
    } catch (err) {
      console.error('Failed to delete todo:', err)
    }
  }

  const filterTodos = (status?: string) => {
    if (!status) return todos
    return todos.filter((todo) => todo.status === status)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('addTodo')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addTodo')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t('titlePlaceholder')}</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('titlePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="description">{t('descriptionPlaceholder')}</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">{t('dueDate')}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <Button onClick={createTodo} className="w-full">
                {t('addTodo')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({todos.length})</TabsTrigger>
          <TabsTrigger value="PENDING">
            {t('pending')} ({filterTodos('PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">
            {t('inProgress')} ({filterTodos('IN_PROGRESS').length})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED">
            {t('completed')} ({filterTodos('COMPLETED').length})
          </TabsTrigger>
        </TabsList>

        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {filterTodos(tab === 'all' ? undefined : tab).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('noTodos')}</p>
            ) : (
              filterTodos(tab === 'all' ? undefined : tab).map((todo) => {
                const StatusIcon = STATUS_ICON[todo.status as keyof typeof STATUS_ICON]
                return (
                  <Card key={todo.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <StatusIcon
                        className={`h-5 w-5 cursor-pointer ${STATUS_COLOR[todo.status as keyof typeof STATUS_COLOR]}`}
                        onClick={() => {
                          const nextStatus =
                            todo.status === 'PENDING'
                              ? 'IN_PROGRESS'
                              : todo.status === 'IN_PROGRESS'
                                ? 'COMPLETED'
                                : 'PENDING'
                          updateTodoStatus(todo.id, nextStatus)
                        }}
                      />
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            todo.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {todo.title}
                        </p>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground">{todo.description}</p>
                        )}
                        {todo.dueDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('dueDate')}: {new Date(todo.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
