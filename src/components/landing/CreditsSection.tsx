'use client'

import { useTranslations } from 'next-intl'
import { useScrollAnimation } from './useScrollAnimation'
import { LandingImage } from './LandingImage'

/**
 * Credits section — "Built with Leading Technology"
 *
 * Renders developer photo placeholder + attribution block with name,
 * faculty, and tech stack label.
 *
 * Responsive: stacks vertically on mobile, horizontal on sm+.
 */
export function CreditsSection() {
  const t = useTranslations('Landing.credits')
  const contentAnim = useScrollAnimation()

  return (
    <section id="aboutUs" className="bg-gray-50 px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 sm:mb-16">
          <h2 className="font-prompt text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:mt-4 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Developer attribution card */}
        <div
          ref={contentAnim.ref}
          data-testid="credits-card"
          className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 md:p-10"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Photo placeholder */}
            <div data-testid="credits-photo-placeholder">
              <LandingImage
                filename="developer-photo.webp"
                alt="Developer photo"
                placeholderLabel="Photo"
                placeholderIcon="👤"
                className="h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32"
                imageClassName="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover shadow-md"
              />
            </div>

            {/* Attribution block */}
            <div className="text-center sm:text-left">
              <h3
                data-testid="credits-name"
                className="font-prompt text-lg font-bold text-gray-900 sm:text-xl"
              >
                รศ.ดร.อุทาน บูรณศักดิ์ศรี
              </h3>
              <p
                data-testid="credits-faculty"
                className="mt-1 text-sm text-gray-600 sm:text-base"
              >
                {t('faculty')}
              </p>
              <span
                data-testid="credits-label"
                className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:mt-3 sm:px-4 sm:py-1 sm:text-sm"
              >
                {t('developer')}
              </span>

              {/* Tech stack badge */}
              <p className="mt-3 text-xs leading-relaxed text-gray-500 sm:mt-4 sm:text-sm">
                {t('stack')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
