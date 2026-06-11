import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, type JWTPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@/generated/client'
import { PendingPageClient } from './pending-client'

/**
 * Page shown to non-ACTIVE users (PENDING, INACTIVE).
 * This page is outside the (app) route group — no sidebar, no app layout.
 */
export default async function PendingPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  // If no session, redirect to login
  if (!token) {
    redirect('/login')
  }

  const payload: JWTPayload | null = verifyToken(token)

  if (!payload) {
    redirect('/login')
  }

  // Fetch the user's current status
  const user = await prisma.webUser.findUnique({
    where: { id: payload.userId },
    select: { status: true },
  })

  if (!user) {
    redirect('/login')
  }

  // If the user is ACTIVE, they should not be on this page — redirect to app
  if (user.status === UserStatus.ACTIVE) {
    redirect('/dashboard')
  }

  return <PendingPageClient status={user.status} />
}
