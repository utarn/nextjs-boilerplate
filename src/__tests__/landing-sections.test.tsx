// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValuePropsSection } from '@/components/landing/ValuePropsSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { TargetAudienceSection } from '@/components/landing/TargetAudienceSection'
import { CreditsSection } from '@/components/landing/CreditsSection'

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
// Tests — ValuePropsSection
// ---------------------------------------------------------------------------

describe('ValuePropsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the section header with i18n keys', () => {
    render(<ValuePropsSection />)

    expect(screen.getByText('valueProps.title')).toBeInTheDocument()
    expect(screen.getByText('valueProps.subtitle')).toBeInTheDocument()
  })

  it('renders exactly 3 value proposition cards', () => {
    render(<ValuePropsSection />)

    const cards = [
      screen.getByTestId('valueprop-card-organize'),
      screen.getByTestId('valueprop-card-search'),
      screen.getByTestId('valueprop-card-reliable'),
    ]
    expect(cards).toHaveLength(3)
  })

  it('renders each value prop title with correct i18n key', () => {
    render(<ValuePropsSection />)

    expect(screen.getByText('valueProps.organize.title')).toBeInTheDocument()
    expect(screen.getByText('valueProps.search.title')).toBeInTheDocument()
    expect(screen.getByText('valueProps.reliable.title')).toBeInTheDocument()
  })

  it('renders each value prop description with correct i18n key', () => {
    render(<ValuePropsSection />)

    expect(screen.getByText('valueProps.organize.description')).toBeInTheDocument()
    expect(screen.getByText('valueProps.search.description')).toBeInTheDocument()
    expect(screen.getByText('valueProps.reliable.description')).toBeInTheDocument()
  })

  it('has the valueProps section id', () => {
    const { container } = render(<ValuePropsSection />)

    const section = container.querySelector('#valueProps')
    expect(section).toBeInTheDocument()
  })

  it('renders card icons with emoji', () => {
    render(<ValuePropsSection />)

    const icons = screen.getAllByRole('img')
    expect(icons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders cards with shadow and rounded corners', () => {
    render(<ValuePropsSection />)

    const card = screen.getByTestId('valueprop-card-organize')
    expect(card.className).toContain('rounded-2xl')
    expect(card.className).toContain('shadow-sm')
  })
})

// ---------------------------------------------------------------------------
// Tests — HowItWorksSection
// ---------------------------------------------------------------------------

describe('HowItWorksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the section header with i18n keys', () => {
    render(<HowItWorksSection />)

    expect(screen.getByText('howItWorks.title')).toBeInTheDocument()
    expect(screen.getByText('howItWorks.subtitle')).toBeInTheDocument()
  })

  it('renders exactly 3 numbered steps', () => {
    render(<HowItWorksSection />)

    const steps = [
      screen.getByTestId('howitworks-step-step1'),
      screen.getByTestId('howitworks-step-step2'),
      screen.getByTestId('howitworks-step-step3'),
    ]
    expect(steps).toHaveLength(3)
  })

  it('renders each step title with correct i18n key', () => {
    render(<HowItWorksSection />)

    expect(screen.getByText('howItWorks.step1.title')).toBeInTheDocument()
    expect(screen.getByText('howItWorks.step2.title')).toBeInTheDocument()
    expect(screen.getByText('howItWorks.step3.title')).toBeInTheDocument()
  })

  it('renders each step description with correct i18n key', () => {
    render(<HowItWorksSection />)

    expect(screen.getByText('howItWorks.step1.description')).toBeInTheDocument()
    expect(screen.getByText('howItWorks.step2.description')).toBeInTheDocument()
    expect(screen.getByText('howItWorks.step3.description')).toBeInTheDocument()
  })

  it('renders numbered step badges (1, 2, 3)', () => {
    render(<HowItWorksSection />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an image placeholder via LandingImage', () => {
    render(<HowItWorksSection />)

    expect(screen.getByTestId('landing-placeholder-how-it-works.webp')).toBeInTheDocument()
  })

  it('has the howItWorks section id', () => {
    const { container } = render(<HowItWorksSection />)

    const section = container.querySelector('#howItWorks')
    expect(section).toBeInTheDocument()
  })

  it('step number badges have blue background', () => {
    render(<HowItWorksSection />)

    const badge = screen.getByText('1')
    expect(badge.className).toContain('bg-blue-600')
    expect(badge.className).toContain('rounded-full')
  })
})

// ---------------------------------------------------------------------------
// Tests — TargetAudienceSection
// ---------------------------------------------------------------------------

describe('TargetAudienceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the section header with i18n keys', () => {
    render(<TargetAudienceSection />)

    expect(screen.getByText('targetAudience.title')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.subtitle')).toBeInTheDocument()
  })

  it('renders exactly 4 audience cards', () => {
    render(<TargetAudienceSection />)

    const cards = [
      screen.getByTestId('audience-card-professional'),
      screen.getByTestId('audience-card-students'),
      screen.getByTestId('audience-card-teams'),
      screen.getByTestId('audience-card-personal'),
    ]
    expect(cards).toHaveLength(4)
  })

  it('renders each audience title with correct i18n key', () => {
    render(<TargetAudienceSection />)

    expect(screen.getByText('targetAudience.professional.title')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.students.title')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.teams.title')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.personal.title')).toBeInTheDocument()
  })

  it('renders each audience description with correct i18n key', () => {
    render(<TargetAudienceSection />)

    expect(screen.getByText('targetAudience.professional.description')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.students.description')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.teams.description')).toBeInTheDocument()
    expect(screen.getByText('targetAudience.personal.description')).toBeInTheDocument()
  })

  it('renders emoji icons for each audience card', () => {
    render(<TargetAudienceSection />)

    const icons = screen.getAllByRole('img')
    expect(icons.length).toBeGreaterThanOrEqual(4)
  })

  it('has the targetAudience section id', () => {
    const { container } = render(<TargetAudienceSection />)

    const section = container.querySelector('#targetAudience')
    expect(section).toBeInTheDocument()
  })

  it('renders cards with rounded corners and shadow', () => {
    render(<TargetAudienceSection />)

    const card = screen.getByTestId('audience-card-professional')
    expect(card.className).toContain('rounded-2xl')
    expect(card.className).toContain('shadow-sm')
  })
})

// ---------------------------------------------------------------------------
// Tests — CreditsSection
// ---------------------------------------------------------------------------

describe('CreditsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the section header with i18n keys', () => {
    render(<CreditsSection />)

    expect(screen.getByText('credits.title')).toBeInTheDocument()
    expect(screen.getByText('credits.subtitle')).toBeInTheDocument()
  })

  it('renders the developer name', () => {
    render(<CreditsSection />)

    expect(screen.getByTestId('credits-name')).toHaveTextContent(
      'รศ.ดร.อุทาน บูรณศักดิ์ศรี',
    )
  })

  it('renders the faculty name from i18n', () => {
    render(<CreditsSection />)

    expect(screen.getByTestId('credits-faculty')).toHaveTextContent('credits.faculty')
  })

  it('renders the developer label from i18n', () => {
    render(<CreditsSection />)

    expect(screen.getByTestId('credits-label')).toHaveTextContent('credits.developer')
  })

  it('renders a photo placeholder via LandingImage', () => {
    render(<CreditsSection />)

    expect(screen.getByTestId('landing-placeholder-developer-photo.webp')).toBeInTheDocument()
  })

  it('renders the tech stack from i18n', () => {
    render(<CreditsSection />)

    expect(screen.getByText('credits.stack')).toBeInTheDocument()
  })

  it('has the aboutUs section id', () => {
    const { container } = render(<CreditsSection />)

    const section = container.querySelector('#aboutUs')
    expect(section).toBeInTheDocument()
  })

  it('renders the credits card with rounded corners', () => {
    render(<CreditsSection />)

    const card = screen.getByTestId('credits-card')
    expect(card.className).toContain('rounded-2xl')
  })

  it('renders the developer label with blue accent', () => {
    render(<CreditsSection />)

    const label = screen.getByTestId('credits-label')
    expect(label.className).toContain('bg-blue-50')
    expect(label.className).toContain('text-blue-700')
  })
})
