'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface HeroSectionProps {
  isAuthenticated: boolean
}

/**
 * Full-viewport snap hero section for the landing page.
 * Displays the app name in Prompt font, tagline, two CTA buttons,
 * an image placeholder, and decorative floating geometric shapes.
 *
 * Responsive: text scales down on mobile, image stacks below content,
 * decorative shapes scale down for small viewports.
 */
export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const t = useTranslations('Landing.hero')

  return (
    <section className="relative flex min-h-screen snap-start items-center justify-center overflow-hidden bg-white py-24">
      {/* Decorative floating geometric shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Blue circle — top right */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#2563eb] opacity-10 sm:-right-16 sm:-top-16 sm:h-72 sm:w-72" />
        {/* Blue rounded rectangle — bottom left */}
        <div className="absolute -bottom-6 -left-6 h-32 w-44 rounded-3xl bg-[#2563eb] opacity-10 sm:-bottom-10 sm:-left-10 sm:h-48 sm:w-64" />
        {/* Gold circle — middle right */}
        <div className="absolute right-1/4 top-1/3 h-24 w-24 rounded-full bg-[#f59e0b] opacity-10 sm:h-32 sm:w-32" />
        {/* Gold rounded rectangle — top left */}
        <div className="absolute left-1/4 top-1/4 h-16 w-28 rounded-2xl bg-[#f59e0b] opacity-10 sm:h-24 sm:w-36" />
        {/* Small blue circle — scattered */}
        <div className="absolute left-[10%] bottom-[30%] h-14 w-14 rounded-full bg-[#2563eb] opacity-10 sm:h-20 sm:w-20" />
        {/* Small gold rectangle — scattered */}
        <div className="absolute right-[15%] bottom-[20%] h-12 w-20 rounded-xl bg-[#f59e0b] opacity-10 sm:h-16 sm:w-24" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:gap-8 sm:px-6">
        {/* Logo / App icon */}
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-blue-50 shadow-sm sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44">
          <span className="text-5xl sm:text-6xl md:text-7xl" role="img" aria-label="TaskFlow logo">
            ✓
          </span>
        </div>

        {/* Badge */}
        <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:px-4 sm:py-1.5 sm:text-sm">
          {t('badge')}
        </span>

        {/* Title */}
        <h1 className="font-prompt text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl">
          {t('title')}{' '}
          <span className="text-blue-600">{t('titleHighlight')}</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-base text-gray-600 sm:text-lg md:text-xl">
          {t('subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex w-full max-w-sm flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
          {/* Primary CTA */}
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 sm:px-8 sm:py-3.5 sm:text-base"
          >
            {isAuthenticated ? t('dashboard') : t('cta')}
          </Link>

          {/* Secondary CTA — smooth scroll to valueProps section */}
          <a
            href="#valueProps"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:px-8 sm:py-3.5 sm:text-base"
          >
            {t('learnMore')}
          </a>
        </div>

        {/* Hero image placeholder */}
        <div className="mt-4 w-full max-w-3xl sm:mt-8">
          <div
            className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100 py-16 sm:py-24"
            data-testid="landing-placeholder-hero-main.webp"
          >
            <div className="text-center">
              <span className="text-5xl" role="img" aria-label="Task Dashboard Preview">
                ✓
              </span>
              <p className="mt-4 text-lg font-medium text-gray-400">
                Task Dashboard Preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
