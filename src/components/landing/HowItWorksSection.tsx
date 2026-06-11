'use client'

import { useTranslations } from 'next-intl'
import { useScrollAnimation, useScrollAnimationItems } from './useScrollAnimation'
import { LandingImage } from './LandingImage'

const STEP_KEYS = ['step1', 'step2', 'step3'] as const

/** Descriptive icons for each step */
const STEP_ICONS: Record<string, string> = {
  step1: '👤',
  step2: '📝',
  step3: '🚀',
}

/**
 * How it works section — "Get Started in 3 Easy Steps"
 *
 * Renders a 3-step flow with numbered steps, icons, and an image placeholder.
 * Uses IntersectionObserver-based entrance animations.
 *
 * Responsive: single-column on mobile with image stacked below steps.
 */
export function HowItWorksSection() {
  const t = useTranslations('Landing.howItWorks')
  const headerAnim = useScrollAnimation()
  const stepRefs = useScrollAnimationItems(STEP_KEYS.length + 1, { staggerDelay: 120 })
  // Index 0-2 = steps, Index 3 = image placeholder

  return (
    <section id="howItWorks" className="bg-gray-50 px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div ref={headerAnim.ref} className="mb-10 sm:mb-16">
          <h2 className="font-prompt text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:mt-4 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Steps */}
          <div className="flex flex-col gap-6 sm:gap-8">
            {STEP_KEYS.map((key, index) => (
              <div
                key={key}
                ref={stepRefs[index]}
                data-testid={`howitworks-step-${key}`}
                className="flex items-start gap-4 sm:gap-5"
              >
                {/* Step number badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shadow-md sm:h-12 sm:w-12 sm:text-xl">
                  {index + 1}
                </div>

                {/* Step content */}
                <div className="pt-0.5 sm:pt-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl sm:text-2xl" role="img" aria-label={t(`${key}.title`)}>
                      {STEP_ICONS[key]}
                    </span>
                    <h3 className="font-prompt text-base font-bold text-gray-900 sm:text-lg">
                      {t(`${key}.title`)}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                    {t(`${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Image placeholder */}
          <div
            ref={stepRefs[STEP_KEYS.length]}
            data-testid="howitworks-image-placeholder"
          >
            <LandingImage
              filename="how-it-works.webp"
              alt="Illustration showing the 3-step process to get started with TaskFlow"
              placeholderLabel="How It Works"
              placeholderIcon="📱"
              className="w-full py-24 sm:py-32 lg:py-40"
              imageClassName="w-full rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
