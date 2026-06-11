import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { LoginClient } from '@/app/(auth)/login/login-client'
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
    renderWithProviders(<LoginClient googleClientId="test-client-id" />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    expect(screen.getByText('Send Magic Link')).toBeInTheDocument()
  })

  it('should render the email input', () => {
    renderWithProviders(<LoginClient googleClientId="test-client-id" />)

    const emailInput = screen.getByPlaceholderText('info@gmail.com')
    expect(emailInput).toBeInTheDocument()
  })

  it('should render the Google login button', () => {
    renderWithProviders(<LoginClient googleClientId="test-client-id" />)

    const googleButton = screen.getByText('Sign in with Google')
    expect(googleButton).toBeInTheDocument()
  })

  it('should not render Google button when googleClientId is null', () => {
    renderWithProviders(<LoginClient googleClientId={null} />)

    expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument()
  })
})
