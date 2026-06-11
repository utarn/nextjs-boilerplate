import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { LoginPageClient } from '@/app/(auth)/login/login-client'
import enMessages from '../../messages/en.json'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider messages={enMessages} locale="en">
      {ui}
    </NextIntlClientProvider>
  )
}

describe('LoginPage', () => {
  it('should render the login form', () => {
    renderWithProviders(<LoginPageClient />)

    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    expect(screen.getByText('Send magic link')).toBeInTheDocument()
  })

  it('should render the email input', () => {
    renderWithProviders(<LoginPageClient />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    expect(emailInput).toBeInTheDocument()
  })

  it('should render the Google login button', () => {
    renderWithProviders(<LoginPageClient />)

    const googleButton = screen.getByText('Sign in with Google')
    expect(googleButton).toBeInTheDocument()
  })
})
