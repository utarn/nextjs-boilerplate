'use client'

import { LandingNavbar } from './LandingNavbar'
import { HeroSection } from './HeroSection'
import { FeaturesSection } from './FeaturesSection'
import { ValuePropsSection } from './ValuePropsSection'
import { HowItWorksSection } from './HowItWorksSection'
import { TargetAudienceSection } from './TargetAudienceSection'
import { CreditsSection } from './CreditsSection'

interface LandingPageProps {
  isAuthenticated: boolean
}

/**
 * Structural shell hosting all landing page sections.
 * Client component — receives `isAuthenticated` from the server page.
 */
export function LandingPage({ isAuthenticated }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNavbar isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection isAuthenticated={isAuthenticated} />
        <ValuePropsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TargetAudienceSection />
        <CreditsSection />
      </main>
    </div>
  )
}
