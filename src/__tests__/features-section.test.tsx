// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturesSection } from '@/components/landing/FeaturesSection'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const prefix = namespace.split('.').pop() ?? namespace
    return `${prefix}.${key}`
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderFeaturesSection() {
  return render(<FeaturesSection />)
}

// ---------------------------------------------------------------------------
// Tests — FeaturesSection
// ---------------------------------------------------------------------------

describe('FeaturesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the section header with i18n keys', () => {
    renderFeaturesSection()

    expect(screen.getByText('features.title')).toBeInTheDocument()
    expect(screen.getByText('features.subtitle')).toBeInTheDocument()
  })

  it('renders exactly 6 feature cards', () => {
    renderFeaturesSection()

    const cards = [
      screen.getByTestId('feature-card-crud'),
      screen.getByTestId('feature-card-realTime'),
      screen.getByTestId('feature-card-themes'),
      screen.getByTestId('feature-card-backgroundJobs'),
      screen.getByTestId('feature-card-responsive'),
      screen.getByTestId('feature-card-i18n'),
    ]
    expect(cards).toHaveLength(6)
  })

  it('renders each feature title with correct i18n key', () => {
    renderFeaturesSection()

    expect(screen.getByText('features.crud.title')).toBeInTheDocument()
    expect(screen.getByText('features.realTime.title')).toBeInTheDocument()
    expect(screen.getByText('features.themes.title')).toBeInTheDocument()
    expect(screen.getByText('features.backgroundJobs.title')).toBeInTheDocument()
    expect(screen.getByText('features.responsive.title')).toBeInTheDocument()
    expect(screen.getByText('features.i18n.title')).toBeInTheDocument()
  })

  it('renders each feature description with correct i18n key', () => {
    renderFeaturesSection()

    expect(screen.getByText('features.crud.description')).toBeInTheDocument()
    expect(screen.getByText('features.realTime.description')).toBeInTheDocument()
    expect(screen.getByText('features.themes.description')).toBeInTheDocument()
    expect(screen.getByText('features.backgroundJobs.description')).toBeInTheDocument()
    expect(screen.getByText('features.responsive.description')).toBeInTheDocument()
    expect(screen.getByText('features.i18n.description')).toBeInTheDocument()
  })

  it('renders image placeholders for each feature card', () => {
    renderFeaturesSection()

    expect(screen.getByTestId('landing-placeholder-feature-crud')).toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-feature-realTime')).toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-feature-themes')).toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-feature-backgroundJobs')).toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-feature-responsive')).toBeInTheDocument()
    expect(screen.getByTestId('landing-placeholder-feature-i18n')).toBeInTheDocument()
  })

  it('has scroll-snap container with mandatory snap type', () => {
    const { container } = renderFeaturesSection()

    const snapContainer = container.querySelector('[style*="scroll-snap-type"]')
    expect(snapContainer).toBeInTheDocument()
    expect(
      (snapContainer as HTMLElement).style.scrollSnapType,
    ).toBe('y mandatory')
  })

  it('each card has snap-start alignment', () => {
    renderFeaturesSection()

    const cards = [
      screen.getByTestId('feature-card-crud'),
      screen.getByTestId('feature-card-realTime'),
      screen.getByTestId('feature-card-themes'),
      screen.getByTestId('feature-card-backgroundJobs'),
      screen.getByTestId('feature-card-responsive'),
      screen.getByTestId('feature-card-i18n'),
    ]

    for (const card of cards) {
      expect((card as HTMLElement).style.scrollSnapAlign).toBe('start')
    }
  })

  it('each card has full viewport height', () => {
    renderFeaturesSection()

    const cards = [
      screen.getByTestId('feature-card-crud'),
      screen.getByTestId('feature-card-realTime'),
      screen.getByTestId('feature-card-themes'),
      screen.getByTestId('feature-card-backgroundJobs'),
      screen.getByTestId('feature-card-responsive'),
      screen.getByTestId('feature-card-i18n'),
    ]

    for (const card of cards) {
      expect(card.className).toContain('h-screen')
    }
  })

  it('renders position indicator dots (6 navigation tabs)', () => {
    renderFeaturesSection()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(6)
  })

  it('first dot is selected by default', () => {
    renderFeaturesSection()

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[3]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[4]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[5]).toHaveAttribute('aria-selected', 'false')
  })

  it('has the features section id', () => {
    const { container } = renderFeaturesSection()

    const section = container.querySelector('#features')
    expect(section).toBeInTheDocument()
  })

  it('alternates layout direction for visual variety', () => {
    renderFeaturesSection()

    const reversedCards = [
      screen.getByTestId('feature-card-realTime'),
      screen.getByTestId('feature-card-backgroundJobs'),
      screen.getByTestId('feature-card-i18n'),
    ]

    for (const card of reversedCards) {
      const inner = card.querySelector('.lg\\:flex-row-reverse')
      expect(inner).toBeInTheDocument()
    }
  })
})
