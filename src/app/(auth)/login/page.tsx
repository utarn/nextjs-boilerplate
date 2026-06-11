import { Suspense } from 'react'
import { LoginClient } from './login-client'

export default function LoginPage() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null

  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <LoginClient googleClientId={googleClientId} />
    </Suspense>
  )
}
