// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingPage } from '@/components/landing/LandingPage'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { HeroSection } from '@/components/landing/HeroSection'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next-intl — return translation keys as values
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    // Return a composite key so tests can assert on i18n key usage
    const prefix = namespace.split('.').pop() ?? namespace
    return `${prefix}.${key}`
  },
  useLocale: () => 'en',
}))

// Mock next/link — render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock useRouter from next/navigation
const mockRouterRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders the full landing page with mocked i18n.
 * Keys come through as "section.key" (e.g. "navbar.brand", "hero.title").
 */
function renderLandingPage(isAuthenticated: boolean) {
  return render(<LandingPage isAuthenticated={isAuthenticated} />)
}

// ---------------------------------------------------------------------------
// Tests — Server page + LandingPage shell
// ---------------------------------------------------------------------------

describe('LandingPage shell', () => {
  it('renders without crashing for unauthenticated user', () => {
    renderLandingPage(false)
    // The shell should contain the navbar and hero
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders without crashing for authenticated user', () => {
    renderLandingPage(true)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('contains section anchors for future sections', () => {
    renderLandingPage(false)
    expect(document.getElementById('valueProps')).toBeInTheDocument()
    expect(document.getElementById('features')).toBeInTheDocument()
    expect(document.getElementById('howItWorks')).toBeInTheDocument()
    expect(document.getElementById('targetAudience')).toBeInTheDocument()
    expect(document.getElementById('aboutUs')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests — LandingNavbar
// ---------------------------------------------------------------------------

describe('LandingNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders brand name', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    expect(screen.getByText('navbar.brand')).toBeInTheDocument()
  })

  it('renders section anchor links on desktop', () => {
    render(<LandingNavbar isAuthenticated={false} />)

    expect(screen.getByText('navbar.features')).toBeInTheDocument()
    expect(screen.getByText('navbar.howItWorks')).toBeInTheDocument()
    expect(screen.getByText('navbar.targetAudience')).toBeInTheDocument()
    expect(screen.getByText('navbar.aboutUs')).toBeInTheDocument()
  })

  it('section links point to correct anchors', () => {
    render(<LandingNavbar isAuthenticated={false} />)

    const featuresLink = screen.getByText('navbar.features').closest('a')
    expect(featuresLink?.getAttribute('href')).toBe('#features')

    const howItWorksLink = screen.getByText('navbar.howItWorks').closest('a')
    expect(howItWorksLink?.getAttribute('href')).toBe('#howItWorks')

    const targetAudienceLink = screen.getByText('navbar.targetAudience').closest('a')
    expect(targetAudienceLink?.getAttribute('href')).toBe('#targetAudience')

    const aboutUsLink = screen.getByText('navbar.aboutUs').closest('a')
    expect(aboutUsLink?.getAttribute('href')).toBe('#aboutUs')
  })

  it('shows login button linking to /login when unauthenticated', () => {
    render(<LandingNavbar isAuthenticated={false} />)

    // Auth button appears in both desktop and mobile menus
    const authButtons = screen.getAllByText('navbar.login')
    expect(authButtons.length).toBeGreaterThanOrEqual(1)
    const link = authButtons[0].closest('a')
    expect(link?.getAttribute('href')).toBe('/login')
  })

  it('shows dashboard button linking to /dashboard when authenticated', () => {
    render(<LandingNavbar isAuthenticated={true} />)

    const authButtons = screen.getAllByText('navbar.dashboard')
    expect(authButtons.length).toBeGreaterThanOrEqual(1)
    const link = authButtons[0].closest('a')
    expect(link?.getAttribute('href')).toBe('/dashboard')
  })

  it('does not show login button when authenticated', () => {
    render(<LandingNavbar isAuthenticated={true} />)
    expect(screen.queryByText('navbar.login')).not.toBeInTheDocument()
  })

  it('does not show dashboard button when unauthenticated', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    expect(screen.queryByText('navbar.dashboard')).not.toBeInTheDocument()
  })

  it('has sticky positioning', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const header = screen.getByRole('banner')
    expect(header.className).toContain('fixed')
  })

  it('initially has transparent background', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const header = screen.getByRole('banner')
    expect(header.className).toContain('bg-transparent')
  })

  it('renders hamburger menu toggle button', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')
    expect(toggle).toBeInTheDocument()
  })

  it('hamburger menu is initially closed', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('mobile-menu-dropdown')).not.toBeInTheDocument()
  })

  it('clicking hamburger toggle opens the mobile menu', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('mobile-menu-dropdown')).toBeInTheDocument()
  })

  it('clicking hamburger toggle again closes the mobile menu', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    // Open
    fireEvent.click(toggle)
    expect(screen.getByTestId('mobile-menu-dropdown')).toBeInTheDocument()

    // Close
    fireEvent.click(toggle)
    expect(screen.queryByTestId('mobile-menu-dropdown')).not.toBeInTheDocument()
  })

  it('mobile menu contains section links when open', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)

    const dropdown = screen.getByTestId('mobile-menu-dropdown')
    expect(dropdown).toBeInTheDocument()

    // Section links should appear inside the dropdown
    const links = dropdown.querySelectorAll('a[href^="#"]')
    expect(links.length).toBe(4)
  })

  it('mobile menu contains auth button when open', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')

    fireEvent.click(toggle)

    const dropdown = screen.getByTestId('mobile-menu-dropdown')
    const authLink = dropdown.querySelector('a[href="/login"]')
    expect(authLink).toBeInTheDocument()
  })

  it('hamburger toggle has aria-controls pointing to mobile menu', () => {
    render(<LandingNavbar isAuthenticated={false} />)
    const toggle = screen.getByTestId('mobile-menu-toggle')
    expect(toggle).toHaveAttribute('aria-controls', 'mobile-menu')
  })
})

// ---------------------------------------------------------------------------
// Tests — HeroSection
// ---------------------------------------------------------------------------

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the app name heading with i18n keys', () => {
    render(<HeroSection isAuthenticated={false} />)

    expect(screen.getByText('hero.title')).toBeInTheDocument()
    expect(screen.getByText('hero.titleHighlight')).toBeInTheDocument()
  })

  it('renders the badge', () => {
    render(<HeroSection isAuthenticated={false} />)
    expect(screen.getByText('hero.badge')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<HeroSection isAuthenticated={false} />)
    expect(screen.getByText('hero.subtitle')).toBeInTheDocument()
  })

  it('renders CTA button linking to /login when unauthenticated', () => {
    render(<HeroSection isAuthenticated={false} />)

    const cta = screen.getByText('hero.cta')
    expect(cta).toBeInTheDocument()
    const link = cta.closest('a')
    expect(link?.getAttribute('href')).toBe('/login')
  })

  it('renders dashboard CTA button linking to /dashboard when authenticated', () => {
    render(<HeroSection isAuthenticated={true} />)

    const cta = screen.getByText('hero.dashboard')
    expect(cta).toBeInTheDocument()
    const link = cta.closest('a')
    expect(link?.getAttribute('href')).toBe('/dashboard')
  })

  it('renders learn more button linking to #valueProps', () => {
    render(<HeroSection isAuthenticated={false} />)

    const learnMore = screen.getByText('hero.learnMore')
    expect(learnMore).toBeInTheDocument()
    const link = learnMore.closest('a')
    expect(link?.getAttribute('href')).toBe('#valueProps')
  })

  it('renders hero image via LandingImage component', () => {
    render(<HeroSection isAuthenticated={false} />)
    const img = screen.getByTestId('landing-image-hero-main.webp')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/landing/hero-main.webp')
  })

  it('renders decorative shapes (blue and gold)', () => {
    const { container } = render(<HeroSection isAuthenticated={false} />)

    const blueShapes = container.querySelectorAll('[class*="bg-[#2563eb]"]')
    expect(blueShapes.length).toBeGreaterThanOrEqual(2)

    const goldShapes = container.querySelectorAll('[class*="bg-[#f59e0b]"]')
    expect(goldShapes.length).toBeGreaterThanOrEqual(2)
  })

  it('has full viewport min height', () => {
    render(<HeroSection isAuthenticated={false} />)
    const section = screen.getByText('hero.title').closest('section')
    expect(section?.className).toContain('min-h-screen')
  })

  it('has snap-start for scroll snapping', () => {
    render(<HeroSection isAuthenticated={false} />)
    const section = screen.getByText('hero.title').closest('section')
    expect(section?.className).toContain('snap-start')
  })
})

// ---------------------------------------------------------------------------
// Tests — LandingPage auth state propagation
// ---------------------------------------------------------------------------

describe('LandingPage auth state propagation', () => {
  it('passes isAuthenticated=false to navbar (shows login)', () => {
    renderLandingPage(false)
    const loginButtons = screen.getAllByText('navbar.login')
    expect(loginButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('navbar.dashboard')).not.toBeInTheDocument()
  })

  it('passes isAuthenticated=true to navbar (shows dashboard)', () => {
    renderLandingPage(true)
    const dashButtons = screen.getAllByText('navbar.dashboard')
    expect(dashButtons.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('navbar.login')).not.toBeInTheDocument()
  })

  it('passes isAuthenticated=false to hero (shows sign-in CTA)', () => {
    renderLandingPage(false)
    expect(screen.getByText('hero.cta')).toBeInTheDocument()
    expect(screen.queryByText('hero.dashboard')).not.toBeInTheDocument()
  })

  it('passes isAuthenticated=true to hero (shows dashboard CTA)', () => {
    renderLandingPage(true)
    expect(screen.getByText('hero.dashboard')).toBeInTheDocument()
  })
})
