import { cookies } from 'next/headers'
import { Prompt } from 'next/font/google'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
})

/**
 * Public landing page at `/`.
 * Server component that reads the `auth_token` cookie and passes
 * `isAuthenticated` to the client component shell.
 * Loads the Prompt font scoped to this page only.
 * Authenticated users are redirected to dashboard.
 */
export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const payload = token ? verifyToken(token) : null

  if (payload) {
    redirect('/dashboard')
  }

  return (
    <div className={prompt.variable}>
      <LandingPage isAuthenticated={false} />
    </div>
  )
}
