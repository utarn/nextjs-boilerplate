import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root page at `/`.
 * Checks auth status and redirects accordingly.
 */
export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const payload = token ? verifyToken(token) : null

  if (payload) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
