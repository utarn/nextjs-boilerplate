import { Suspense } from 'react'
import { LoginPageClient } from './login-client'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  )
}
