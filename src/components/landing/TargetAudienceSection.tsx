'use client'

import { useTranslations } from 'next-intl'
import { useScrollAnimation, useScrollAnimationItems } from './useScrollAnimation'

const AUDIENCE_KEYS = ['professional', 'students', 'teams', 'personal'] as const

/** Emoji icons for each audience use case */
const AUDIENCE_ICONS: Record<string, string> = {
  professional: '👨‍💼',
  students: '🎓',
  teams: '👥',
  personal: '💪',
}

/**
 * Target audience section — "Designed for Everyone"
 *
 * Renders 4 use cases in a grid with emoji icons and descriptions.
 * Uses IntersectionObserver-based entrance animations.
 *
 * Responsive: single column on mobile, 2-column on sm, 4-column on lg.
 */
export function TargetAudienceSection() {
  const t = useTranslations('Landing.targetAudience')
  const headerAnim = useScrollAnimation()
  const cardRefs = useScrollAnimationItems(AUDIENCE_KEYS.length, { staggerDelay: 120 })

  return (
    <section id="targetAudience" className="bg-white px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div // eslint-disable-next-line react-hooks/refs
          ref={headerAnim.ref} className="mb-10 sm:mb-16">
          <h2 className="font-prompt text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:mt-4 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Audience cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {AUDIENCE_KEYS.map((key, index) => (
            <div
              key={key}
              ref={cardRefs[index]}
              data-testid={`audience-card-${key}`}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8"
            >
              {/* Emoji icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl sm:mb-5 sm:h-14 sm:w-14 sm:text-3xl">
                <span role="img" aria-label={t(`${key}.title`)}>
                  {AUDIENCE_ICONS[key]}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-prompt text-base font-bold text-gray-900 sm:text-lg">
                {t(`${key}.title`)}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:mt-3">
                {t(`${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
