'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Paperclip,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { useSocketEvent } from '@/components/providers/SocketProvider'
import type { TodoCreatedPayload, TodoUpdatedPayload, TodoDeletedPayload } from '@/lib/channel-types'

type TodoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Todo {
  id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: TodoPriority
  completedAt: string | null
  dueDate: string | null
  attachmentPath: string | null
  attachmentName: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_ICON: Record<TodoStatus, typeof Circle> = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
}

const STATUS_COLOR: Record<TodoStatus, string> = {
  PENDING: 'text-yellow-500',
  IN_PROGRESS: 'text-blue-500',
  COMPLETED: 'text-green-500',
  CANCELLED: 'text-red-500',
}

const PRIORITY_STYLES: Record<TodoPriority, { label: string; class: string }> = {
  LOW: { label: 'priorityLow', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  MEDIUM: { label: 'priorityMedium', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  HIGH: { label: 'priorityHigh', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  URGENT: { label: 'priorityUrgent', class: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

interface FormErrors {
  title?: string
  quota?: string
  storage?: string
}

export function TodosPageClient() {
  const t = useTranslations('todos')
  const tCommon = useTranslations('common')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState<TodoPriority>('MEDIUM')
  const [newFile, setNewFile] = useState<File | null>(null)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<TodoPriority>('MEDIUM')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false)

  // Error state
  const [formErrors, setFormErrors] = useState<FormErrors>({})

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodos()
  }, [fetchTodos])

  // Real-time updates — typed socket events
  useSocketEvent<TodoCreatedPayload>('todo:created', () => {
    // New todo created: refetch the full list to get complete data
    fetchTodos()
  })

  useSocketEvent<TodoUpdatedPayload>('todo:updated', (data) => {
    // Optimistically update status locally for immediate feedback
    setTodos((prev) =>
      prev.map((t) =>
        t.id === data.todoId ? { ...t, status: data.status as TodoStatus } : t,
      ),
    )
    // Refetch in the background to sync any other field changes
    fetchTodos()
  })

  useSocketEvent<TodoDeletedPayload>('todo:deleted', (data) => {
    // Remove the deleted todo from the local list immediately
    setTodos((prev) => prev.filter((t) => t.id !== data.todoId))
  })

  const resetCreateForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewDueDate('')
    setNewPriority('MEDIUM')
    setNewFile(null)
    setFormErrors({})
  }

  const resetEditForm = () => {
    setEditTitle('')
    setEditDescription('')
    setEditDueDate('')
    setEditPriority('MEDIUM')
    setEditFile(null)
    setRemoveExistingAttachment(false)
    setEditingTodo(null)
    setFormErrors({})
  }

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    setEditDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '')
    setEditPriority(todo.priority)
    setEditFile(null)
    setRemoveExistingAttachment(false)
    setFormErrors({})
    setEditOpen(true)
  }

  const createTodo = async () => {
    if (!newTitle.trim()) {
      setFormErrors({ title: t('errorTitleRequired') })
      return
    }

    setFormErrors({})

    try {
      const formData = new FormData()
      formData.append('title', newTitle)
      if (newDescription) formData.append('description', newDescription)
      if (newDueDate) formData.append('dueDate', newDueDate)
      formData.append('priority', newPriority)
      if (newFile) formData.append('attachment', newFile)

      const res = await fetch('/api/todos', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        resetCreateForm()
        setCreateOpen(false)
        fetchTodos()
      } else if (res.status === 413) {
        const data = await res.json()
        setFormErrors({ storage: data.error || t('errorStorageQuota') })
      } else {
        const data = await res.json()
        setFormErrors({ quota: data.error || t('errorCreateFailed') })
      }
    } catch (err) {
      console.error('Failed to create todo:', err)
      setFormErrors({ quota: t('errorCreateFailed') })
    }
  }

  const updateTodo = async () => {
    if (!editingTodo) return
    if (!editTitle.trim()) {
      setFormErrors({ title: t('errorTitleRequired') })
      return
    }

    setFormErrors({})

    try {
      const formData = new FormData()
      formData.append('title', editTitle)
      formData.append('description', editDescription || '')
      if (editDueDate) formData.append('dueDate', editDueDate)
      formData.append('priority', editPriority)
      if (editFile) formData.append('attachment', editFile)
      if (removeExistingAttachment) formData.append('removeAttachment', 'true')

      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (res.ok) {
        resetEditForm()
        setEditOpen(false)
        fetchTodos()
      } else if (res.status === 413) {
        const data = await res.json()
        setFormErrors({ storage: data.error || t('errorStorageQuota') })
      } else {
        setFormErrors({ quota: t('errorUpdateFailed') })
      }
    } catch (err) {
      console.error('Failed to update todo:', err)
      setFormErrors({ quota: t('errorUpdateFailed') })
    }
  }

  const updateTodoStatus = async (todoId: string, status: TodoStatus) => {
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

  const getNextStatus = (status: TodoStatus): TodoStatus => {
    switch (status) {
      case 'PENDING':
        return 'IN_PROGRESS'
      case 'IN_PROGRESS':
        return 'COMPLETED'
      case 'COMPLETED':
        return 'PENDING'
      default:
        return 'PENDING'
    }
  }

  const filterTodos = (status?: string) => {
    if (!status) return todos
    return todos.filter((todo) => todo.status === status)
  }

  const formatPriority = (priority: TodoPriority): string => {
    const style = PRIORITY_STYLES[priority]
    return t(style.label)
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
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) resetCreateForm()
          }}
        >
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
              {/* Title */}
              <div>
                <Label htmlFor="create-title">{t('titlePlaceholder')}</Label>
                <Input
                  id="create-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('titlePlaceholder')}
                />
                {formErrors.title && (
                  <p className="text-sm text-destructive mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="create-description">{t('descriptionPlaceholder')}</Label>
                <Input
                  id="create-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="create-priority">{t('priority')}</Label>
                <select
                  id="create-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TodoPriority)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="LOW">{t('priorityLow')}</option>
                  <option value="MEDIUM">{t('priorityMedium')}</option>
                  <option value="HIGH">{t('priorityHigh')}</option>
                  <option value="URGENT">{t('priorityUrgent')}</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="create-dueDate">{t('dueDate')}</Label>
                <Input
                  id="create-dueDate"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              {/* File Attachment */}
              <div>
                <Label htmlFor="create-attachment">{t('attachment')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="create-attachment"
                    type="file"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-sm file:font-medium hover:file:bg-primary/20"
                  />
                </div>
                {newFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Errors */}
              {formErrors.storage && (
                <p className="text-sm text-destructive">{formErrors.storage}</p>
              )}
              {formErrors.quota && (
                <p className="text-sm text-destructive">{formErrors.quota}</p>
              )}

              <Button onClick={createTodo} className="w-full">
                {t('addTodo')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            {t('all')} ({todos.length})
          </TabsTrigger>
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
                const StatusIcon = STATUS_ICON[todo.status as TodoStatus]
                const priorityStyle = PRIORITY_STYLES[todo.priority as TodoPriority]
                return (
                  <Card key={todo.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      {/* Status icon */}
                      <StatusIcon
                        className={`h-5 w-5 cursor-pointer shrink-0 ${STATUS_COLOR[todo.status as TodoStatus]}`}
                        onClick={() => updateTodoStatus(todo.id, getNextStatus(todo.status as TodoStatus))}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-medium ${
                              todo.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {todo.title}
                          </span>
                          <Badge variant="outline" className={priorityStyle.class}>
                            {formatPriority(todo.priority as TodoPriority)}
                          </Badge>
                          {todo.attachmentPath && (
                            <a
                              href={`/api/todos/${todo.id}/attachment`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
                              title={todo.attachmentName || t('attachment')}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {todo.dueDate && (
                            <span>
                              {t('dueDate')}: {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {todo.completedAt && (
                            <span>
                              {t('completedAt')}: {new Date(todo.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(todo)}
                          title={tCommon('edit')}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTodo(todo.id)}
                          title={tCommon('delete')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) resetEditForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editTodo')}</DialogTitle>
          </DialogHeader>
          {editingTodo && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="edit-title">{t('titlePlaceholder')}</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('titlePlaceholder')}
                />
                {formErrors.title && (
                  <p className="text-sm text-destructive mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="edit-description">{t('descriptionPlaceholder')}</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="edit-priority">{t('priority')}</Label>
                <select
                  id="edit-priority"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TodoPriority)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="LOW">{t('priorityLow')}</option>
                  <option value="MEDIUM">{t('priorityMedium')}</option>
                  <option value="HIGH">{t('priorityHigh')}</option>
                  <option value="URGENT">{t('priorityUrgent')}</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="edit-dueDate">{t('dueDate')}</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>

              {/* Current Attachment */}
              {editingTodo.attachmentPath && !removeExistingAttachment && (
                <div>
                  <Label>{t('currentAttachment')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`/api/todos/${editingTodo.id}/attachment`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {editingTodo.attachmentName || t('attachment')}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveExistingAttachment(true)}
                      className="text-xs text-destructive"
                    >
                      {t('removeAttachment')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Replace/Add Attachment */}
              {(!editingTodo.attachmentPath || removeExistingAttachment) && (
                <div>
                  <Label htmlFor="edit-attachment">
                    {editingTodo.attachmentPath ? t('replaceAttachment') : t('attachment')}
                  </Label>
                  <Input
                    id="edit-attachment"
                    type="file"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    className="file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-sm file:font-medium hover:file:bg-primary/20"
                  />
                  {editFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {editFile.name} ({(editFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* Errors */}
              {formErrors.storage && (
                <p className="text-sm text-destructive">{formErrors.storage}</p>
              )}
              {formErrors.quota && (
                <p className="text-sm text-destructive">{formErrors.quota}</p>
              )}

              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1">
                    {tCommon('cancel')}
                  </Button>
                </DialogClose>
                <Button onClick={updateTodo} className="flex-1">
                  {tCommon('save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
