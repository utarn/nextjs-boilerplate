import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, type JWTPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@/generated/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { SocketProvider } from '@/components/providers/SocketProvider'

/**
 * Layout for authenticated routes.
 * Server component that reads the JWT cookie, verifies it, and fetches the
 * user from the database. Redirects to /login if the session is invalid.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  const payload: JWTPayload | null = verifyToken(token)

  if (!payload) {
    redirect('/login')
  }

  // Fetch fresh user data from DB to ensure status is current
  const user = await prisma.webUser.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, displayName: true, role: true, status: true },
  })

  if (!user || user.status !== UserStatus.ACTIVE) {
    redirect('/login')
  }

  return (
    <SocketProvider>
      <AppLayout
        user={{
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        }}
      >
        {children}
      </AppLayout>
    </SocketProvider>
  )
}
