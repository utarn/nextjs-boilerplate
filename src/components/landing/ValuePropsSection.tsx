'use client'

import { useTranslations } from 'next-intl'
import { useScrollAnimation, useScrollAnimationItems } from './useScrollAnimation'

/** Value proposition keys matching Landing.valueProps.* in locale files */
const VALUE_PROP_KEYS = ['organize', 'search', 'reliable'] as const

/** Icon for each value proposition */
const VALUE_PROP_ICONS: Record<string, string> = {
  organize: '📋',
  search: '🔍',
  reliable: '🔒',
}

/**
 * Value propositions section — "Why TaskFlow"
 *
 * Renders 3 value prop cards in a grid with IntersectionObserver-based
 * entrance animations (fade-in + slide-up with spring easing).
 *
 * Responsive: single-column on mobile, 3-column grid on md+.
 */
export function ValuePropsSection() {
  const t = useTranslations('Landing.valueProps')
  const headerAnim = useScrollAnimation()
  const cardRefs = useScrollAnimationItems(VALUE_PROP_KEYS.length, { staggerDelay: 120 })

  return (
    <section id="valueProps" className="bg-white px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div // eslint-disable-next-line react-hooks/refs
          ref={headerAnim.ref} className="mb-10 sm:mb-16">
          <h2 className="text-center font-prompt text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:mt-4 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Value props grid — single column on mobile, 3-column on md+ */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          {VALUE_PROP_KEYS.map((key, index) => (
            <div
              key={key}
              ref={cardRefs[index]}
              data-testid={`valueprop-card-${key}`}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8"
            >
              {/* Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl sm:mb-5 sm:h-14 sm:w-14 sm:text-3xl">
                <span role="img" aria-label={t(`${key}.title`)}>
                  {VALUE_PROP_ICONS[key]}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-prompt text-lg font-bold text-gray-900 sm:text-xl">
                {t(`${key}.title`)}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:mt-3 sm:text-base">
                {t(`${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
