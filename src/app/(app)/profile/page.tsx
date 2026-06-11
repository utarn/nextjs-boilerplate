'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfile {
  id: string
  email: string
  displayName: string
  role: string
  createdAt: string
}

export default function ProfilePage() {
  const t = useTranslations('nav')
  const [profile, setProfile] = useState<UserProfile | null>(null)
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
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!profile) {
    return <p>Failed to load profile</p>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('profile')}</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{profile.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Email: {profile.email}</p>
          <p className="text-sm text-muted-foreground">Role: {profile.role}</p>
          <p className="text-sm text-muted-foreground">
            Joined: {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
