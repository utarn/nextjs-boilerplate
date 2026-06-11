// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingImage } from '@/components/landing/LandingImage'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const prefix = namespace.split('.').pop() ?? namespace
    return `${prefix}.${key}`
  },
  useLocale: () => 'en',
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Tests — LandingImage placeholder vs real image
// ---------------------------------------------------------------------------

describe('LandingImage', () => {
  it('renders an img tag when forcePlaceholder is not set', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
      />,
    )

    const img = screen.getByTestId('landing-image-test-image.png')
    expect(img).toBeInTheDocument()
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/landing/test-image.png')
    expect(img).toHaveAttribute('alt', 'Test alt text')
  })

  it('renders placeholder when forcePlaceholder is true', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        forcePlaceholder={true}
      />,
    )

    expect(screen.queryByTestId('landing-image-test-image.png')).not.toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-test-image.png')).toBeInTheDocument()
    expect(screen.getByText('Test Placeholder')).toBeInTheDocument()
  })

  it('renders placeholder icon when provided and forced', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        placeholderIcon="🖼️"
        forcePlaceholder={true}
      />,
    )

    expect(screen.getByText('🖼️')).toBeInTheDocument()
  })

  it('does not render placeholder icon when not provided', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        forcePlaceholder={true}
      />,
    )

    const placeholder = screen.getByTestId('landing-placeholder-test-image.png')
    expect(placeholder.querySelector('[role="img"]')).not.toBeInTheDocument()
  })

  it('placeholder has dashed border and gray background classes', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        forcePlaceholder={true}
      />,
    )

    const placeholder = screen.getByTestId('landing-placeholder-test-image.png')
    expect(placeholder.className).toContain('border-dashed')
    expect(placeholder.className).toContain('bg-gray-100')
    expect(placeholder.className).toContain('rounded-2xl')
  })

  it('applies custom className to placeholder', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        className="w-1/2 h-64"
        forcePlaceholder={true}
      />,
    )

    const placeholder = screen.getByTestId('landing-placeholder-test-image.png')
    expect(placeholder.className).toContain('w-1/2')
    expect(placeholder.className).toContain('h-64')
  })

  it('applies custom imageClassName to img element', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        imageClassName="rounded-xl shadow-lg"
      />,
    )

    const img = screen.getByTestId('landing-image-test-image.png')
    expect(img.className).toContain('rounded-xl')
    expect(img.className).toContain('shadow-lg')
  })

  it('falls back to placeholder when img triggers onError', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        placeholderIcon="📄"
      />,
    )

    const img = screen.getByTestId('landing-image-test-image.png')
    expect(img).toBeInTheDocument()

    fireEvent.error(img)

    expect(screen.queryByTestId('landing-image-test-image.png')).not.toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-test-image.png')).toBeInTheDocument()
    expect(screen.getByText('Test Placeholder')).toBeInTheDocument()
    expect(screen.getByText('📄')).toBeInTheDocument()
  })

  it('uses default className when none provided', () => {
    render(
      <LandingImage
        filename="test-image.png"
        alt="Test alt text"
        placeholderLabel="Test Placeholder"
        forcePlaceholder={true}
      />,
    )

    const placeholder = screen.getByTestId('landing-placeholder-test-image.png')
    expect(placeholder.className).toContain('w-full')
  })
})

// ---------------------------------------------------------------------------
// Tests — Mobile navbar toggle (additional coverage)
// ---------------------------------------------------------------------------

describe('LandingNavbar mobile toggle', () => {
  it('toggle button has correct aria-label when closed', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')
    expect(toggle).toHaveAttribute('aria-label', 'Open menu')
  })

  it('toggle button has correct aria-label when open', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-label', 'Close menu')
  })

  it('mobile menu closes when a section link is clicked', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)
    expect(screen.getByTestId('mobile-menu-dropdown')).toBeInTheDocument()

    const dropdown = screen.getByTestId('mobile-menu-dropdown')
    const featuresLink = dropdown.querySelector('a[href="#features"]')
    expect(featuresLink).toBeInTheDocument()
    fireEvent.click(featuresLink!)

    expect(screen.queryByTestId('mobile-menu-dropdown')).not.toBeInTheDocument()
  })

  it('mobile menu closes when auth button is clicked', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)
    expect(screen.getByTestId('mobile-menu-dropdown')).toBeInTheDocument()

    const dropdown = screen.getByTestId('mobile-menu-dropdown')
    const authLink = dropdown.querySelector('a[href="/login"]')
    expect(authLink).toBeInTheDocument()
    fireEvent.click(authLink!)

    expect(screen.queryByTestId('mobile-menu-dropdown')).not.toBeInTheDocument()
  })

  it('shows dashboard auth in mobile menu when authenticated', () => {
    render(<LandingNavbar isAuthenticated={true} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)

    const dropdown = screen.getByTestId('mobile-menu-dropdown')
    const dashLink = dropdown.querySelector('a[href="/dashboard"]')
    expect(dashLink).toBeInTheDocument()
  })
})
