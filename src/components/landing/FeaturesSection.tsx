'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LandingImage } from './LandingImage'

/** Feature card keys matching Landing.features.* in locale files */
const FEATURE_KEYS = ['crud', 'realTime', 'themes', 'backgroundJobs', 'responsive', 'i18n'] as const

/** Emoji icons for each feature card */
const FEATURE_ICONS: Record<string, string> = {
  crud: '📝',
  realTime: '⚡',
  themes: '🎨',
  backgroundJobs: '⚙️',
  responsive: '📱',
  i18n: '🌐',
}

/** Descriptive labels for image placeholders */
const PLACEHOLDER_LABELS: Record<string, string> = {
  crud: 'Task Management',
  realTime: 'Real-Time Updates',
  themes: 'Theme Gallery',
  backgroundJobs: 'Background Processing',
  responsive: 'Responsive Design',
  i18n: 'Internationalization',
}

/** Image filenames for each feature card */
const FEATURE_IMAGES: Record<string, string> = {
  crud: 'feature-crud.webp',
  realTime: 'feature-realtime.webp',
  themes: 'feature-themes.webp',
  backgroundJobs: 'feature-background.webp',
  responsive: 'feature-responsive.webp',
  i18n: 'feature-i18n.webp',
}

/** Alt text for each feature image */
const FEATURE_ALT: Record<string, string> = {
  crud: 'Task management dashboard showing todo list with CRUD operations',
  realTime: 'Real-time collaboration updates across team members',
  themes: 'Gallery of 42 available themes for the application',
  backgroundJobs: 'Background job processing queue management',
  responsive: 'Responsive design adapting to mobile and desktop screens',
  i18n: 'Multilingual support showing English and Thai translations',
}

/**
 * Scroll-snap carousel of 6 full-viewport feature cards.
 *
 * Each card fills the viewport height and snaps into view via CSS
 * scroll-snap-type: y mandatory. A dot indicator on the right side
 * shows which card is currently active.
 *
 * Responsive: on mobile, cards use single-column layout with reduced
 * padding. Dot indicators are smaller and repositioned.
 */
export function FeaturesSection() {
  const t = useTranslations('Landing.features')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track which card is in view via IntersectionObserver
  const observeCards = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = cardRefs.current.indexOf(
              entry.target as HTMLDivElement,
            )
            if (index !== -1) {
              setActiveIndex(index)
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6,
      },
    )

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card)
    })

    return observer
  }, [])

  useEffect(() => {
    const observer = observeCards()
    return () => observer?.disconnect()
  }, [observeCards])

  // Scroll to a specific card when dot is clicked.
  const scrollToCard = (index: number) => {
    const container = scrollRef.current
    const card = cardRefs.current[index]
    if (container && card) {
      container.scrollTo({ top: card.offsetTop, behavior: 'smooth' })
    }
  }

  return (
    <section id="features">
      {/* Section header — sits above the snap container */}
      <div className="bg-white px-4 pb-8 pt-16 text-center sm:px-6 sm:pb-12 sm:pt-20">
        <h2 className="font-prompt text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:mt-4 sm:text-lg">
          {t('subtitle')}
        </p>
      </div>

      {/* Wrapper positions the dots indicator relative to the snap area */}
      <div className="relative">
        {/* Snap scroll container — only this area uses scroll-snap */}
        <div
          ref={scrollRef}
          className="h-screen overflow-y-auto"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {FEATURE_KEYS.map((key, index) => {
            const isReversed = index % 2 === 1
            const icon = FEATURE_ICONS[key]
            const placeholderLabel = PLACEHOLDER_LABELS[key]
            const imageFile = FEATURE_IMAGES[key]
            const imageAlt = FEATURE_ALT[key]

            return (
              <div
                key={key}
                ref={(el) => {
                  cardRefs.current[index] = el
                }}
                className="flex h-screen w-full snap-start items-center justify-center bg-white px-4 sm:px-6"
                style={{ scrollSnapAlign: 'start' }}
                data-testid={`feature-card-${key}`}
              >
                <div
                  className={`mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:gap-16 ${
                    isReversed ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Image placeholder */}
                  <div className="w-full max-w-sm flex-1 sm:max-w-md lg:max-w-lg">
                    <LandingImage
                      filename={imageFile}
                      alt={imageAlt}
                      placeholderLabel={placeholderLabel}
                      placeholderIcon={icon}
                      className="w-full py-20 sm:py-32"
                      imageClassName="w-full rounded-2xl shadow-lg"
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex-1 text-center lg:text-left">
                    <span className="mb-4 inline-block text-4xl lg:hidden">
                      <span role="img" aria-label={placeholderLabel}>
                        {icon}
                      </span>
                    </span>
                    <h3 className="font-prompt text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                      {t(`${key}.title`)}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-gray-600 sm:mt-4 sm:text-lg">
                      {t(`${key}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Position indicator dots — positioned over the snap area */}
        <div
          className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:right-6 sm:gap-3"
          role="tablist"
          aria-label="Feature cards navigation"
        >
          {FEATURE_KEYS.map((key, index) => (
            <button
              key={key}
              onClick={() => scrollToCard(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 sm:h-3 sm:w-3 ${
                activeIndex === index
                  ? 'scale-125 bg-blue-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Feature ${index + 1}: ${key}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
