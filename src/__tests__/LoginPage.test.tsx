import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  it('should show email validation error on empty submission', async () => {
    renderWithProviders(<LoginClient googleClientId={null} />)

    // Submit the form directly (happy-dom may block submit via required attribute
    // when using fireEvent.click on the button)
    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeInTheDocument()
    })
  })

  it('should show loading state during magic link submission', async () => {
    // Keep fetch pending so the component stays in loading state
    global.fetch = vi.fn(() => new Promise(() => {}))

    renderWithProviders(<LoginClient googleClientId={null} />)

    const emailInput = screen.getByPlaceholderText('info@gmail.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const submitButton = screen.getByText('Send Magic Link')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })
  })

  it('should render the correct structure with heading and description', () => {
    renderWithProviders(<LoginClient googleClientId="test-client-id" />)

    const heading = screen.getByRole('heading', { name: 'Sign In' })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')

    expect(
      screen.getByText('Enter your email to sign in to your account!'),
    ).toBeInTheDocument()
  })
})
