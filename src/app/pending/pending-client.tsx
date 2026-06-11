'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Clock, Ban } from 'lucide-react'

interface PendingPageClientProps {
  status: string
}

export function PendingPageClient({ status }: PendingPageClientProps) {
  const t = useTranslations('Pending')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  let icon: React.ReactNode
  let title: string
  let message: string

  switch (status) {
    case 'PENDING':
      icon = <Clock className="size-16 text-amber-500" />
      title = t('pendingTitle')
      message = t('pendingMessage')
      break
    case 'INACTIVE':
      icon = <Ban className="size-16 text-gray-500" />
      title = t('deactivatedTitle')
      message = t('deactivatedMessage')
      break
    default:
      icon = <Clock className="size-16 text-amber-500" />
      title = t('pendingTitle')
      message = t('pendingMessage')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        <div className="flex justify-center mb-6">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{message}</p>
        <Button onClick={handleLogout} variant="outline" className="w-full">
          {t('logout')}
        </Button>
      </div>
    </div>
  )
}
