'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LandingNavbarProps {
  isAuthenticated: boolean
}

const SCROLL_THRESHOLD = 50

/**
 * Sticky transparent navbar for the landing page.
 *
 * Desktop: shows brand name, section anchor links inline, language switcher,
 * and a conditional auth button.
 *
 * Mobile (< md): collapses section links and auth button into a hamburger
 * menu with inline language toggle. Clicking outside or navigating closes it.
 */
export function LandingNavbar({ isAuthenticated }: LandingNavbarProps) {
  const t = useTranslations('Landing.navbar')
  const currentLocale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function handleLocaleChange(newLocale: string) {
    if (newLocale === currentLocale) return
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
    startTransition(() => {
      router.refresh()
    })
  }

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sectionLinks = [
    { href: '#features', label: t('features') },
    { href: '#howItWorks', label: t('howItWorks') },
    { href: '#targetAudience', label: t('targetAudience') },
    { href: '#aboutUs', label: t('aboutUs') },
  ] as const

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-white shadow-md'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="font-prompt text-xl font-bold text-gray-900">
          {t('brand')}
        </Link>

        {/* Section links — desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {sectionLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Language switcher + Auth button — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Language toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => handleLocaleChange('th')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                currentLocale === 'th'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isPending}
            >
              ไทย
            </button>
            <button
              onClick={() => handleLocaleChange('en')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                currentLocale === 'en'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isPending}
            >
              EN
            </button>
          </div>

          {/* Auth button — desktop */}
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            {isAuthenticated ? t('dashboard') : t('login')}
          </Link>
        </div>

        {/* Language toggle + Hamburger — mobile only */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile language toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => handleLocaleChange('th')}
              className={`rounded-md px-2 py-1 transition-colors ${
                currentLocale === 'th'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isPending}
            >
              ไทย
            </button>
            <button
              onClick={() => handleLocaleChange('en')}
              className={`rounded-md px-2 py-1 transition-colors ${
                currentLocale === 'en'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isPending}
            >
              EN
            </button>
          </div>

          {/* Hamburger button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            data-testid="mobile-menu-toggle"
          >
            {/* Hamburger / close icon */}
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              {menuOpen ? (
                /* X icon */
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                /* Hamburger icon */
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-menu"
          className="border-t border-gray-100 bg-white px-6 pb-6 pt-2 shadow-lg md:hidden"
          data-testid="mobile-menu-dropdown"
        >
          <ul className="flex flex-col gap-1">
            {sectionLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Auth button — mobile */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              onClick={closeMenu}
              className="block w-full rounded-lg bg-blue-600 px-5 py-3 text-center text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              {isAuthenticated ? t('dashboard') : t('login')}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
