'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StorageUsageCard } from '@/components/profile/StorageUsageCard'
import { StorageWarningBanner } from '@/components/profile/StorageWarningBanner'

interface UserProfile {
  id: string
  email: string
  displayName: string
  role: string
  createdAt: string
}

interface StorageData {
  usedBytes: string
  quotaBytes: string
  isNearLimit: boolean
}

export default function ProfilePage() {
  const t = useTranslations('nav')
  const tp = useTranslations('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [storage, setStorage] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      }
    }

    async function fetchStorage() {
      try {
        const res = await fetch('/api/user/storage')
        if (res.ok) {
          const data = await res.json()
          setStorage(data)
        }
      } catch (err) {
        console.error('Failed to fetch storage:', err)
      }
    }

    Promise.all([fetchProfile(), fetchStorage()]).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">{tp('loading')}</p>
  }

  if (!profile) {
    return <p>{tp('errorLoad')}</p>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('profile')}</h1>

      {/* Storage Warning Banner */}
      {storage && storage.isNearLimit && (
        <div className="mb-6">
          <StorageWarningBanner
            usedBytes={storage.usedBytes}
            quotaBytes={storage.quotaBytes}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{profile.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{tp('email')}: {profile.email}</p>
            <p className="text-sm text-muted-foreground">{tp('role')}: {profile.role}</p>
            <p className="text-sm text-muted-foreground">
              {tp('joined')}: {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Storage Usage Card */}
        {storage && (
          <StorageUsageCard
            usedBytes={storage.usedBytes}
            quotaBytes={storage.quotaBytes}
          />
        )}
      </div>
    </div>
  )
}
