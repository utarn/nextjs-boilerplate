// @vitest-environment node

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// i18n completeness — Landing namespace keys present in both locale files
// ---------------------------------------------------------------------------

const WORKTREE_ROOT = path.resolve(__dirname, '..', '..')

// All expected keys in the Landing namespace (dot-notation for nested)
const EXPECTED_LANDING_KEYS = [
  'navbar.brand',
  'navbar.home',
  'navbar.features',
  'navbar.howItWorks',
  'navbar.targetAudience',
  'navbar.aboutUs',
  'navbar.login',
  'navbar.dashboard',
  'navbar.getStarted',
  'hero.badge',
  'hero.title',
  'hero.titleHighlight',
  'hero.subtitle',
  'hero.cta',
  'hero.ctaSecondary',
  'hero.learnMore',
  'hero.dashboard',
  'hero.stats.messages',
  'hero.stats.users',
  'hero.stats.uptime',
  'valueProps.title',
  'valueProps.subtitle',
  'valueProps.organize.title',
  'valueProps.organize.description',
  'valueProps.search.title',
  'valueProps.search.description',
  'valueProps.reliable.title',
  'valueProps.reliable.description',
  'features.title',
  'features.subtitle',
  'features.crud.title',
  'features.crud.description',
  'features.realTime.title',
  'features.realTime.description',
  'features.themes.title',
  'features.themes.description',
  'features.backgroundJobs.title',
  'features.backgroundJobs.description',
  'features.responsive.title',
  'features.responsive.description',
  'features.i18n.title',
  'features.i18n.description',
  'howItWorks.title',
  'howItWorks.subtitle',
  'howItWorks.step1.title',
  'howItWorks.step1.description',
  'howItWorks.step2.title',
  'howItWorks.step2.description',
  'howItWorks.step3.title',
  'howItWorks.step3.description',
  'targetAudience.title',
  'targetAudience.subtitle',
  'targetAudience.professional.title',
  'targetAudience.professional.description',
  'targetAudience.students.title',
  'targetAudience.students.description',
  'targetAudience.teams.title',
  'targetAudience.teams.description',
  'targetAudience.personal.title',
  'targetAudience.personal.description',
  'credits.title',
  'credits.subtitle',
  'credits.developer',
  'credits.faculty',
  'credits.stack',
  'footer.rights',
  'footer.tagline',
]

/**
 * Recursively resolves a dot-notated key from a nested object.
 * Returns `undefined` if any segment is missing.
 */
function resolveKey(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

describe('i18n completeness: Landing namespace', () => {
  const locales = ['th', 'en'] as const

  for (const locale of locales) {
    describe(`${locale}.json`, () => {
      let landing: Record<string, unknown>

      it('has a Landing top-level key', () => {
        const filePath = path.join(WORKTREE_ROOT, 'messages', `${locale}.json`)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)
        expect(json.Landing).toBeDefined()
        expect(typeof json.Landing).toBe('object')
        landing = json.Landing as Record<string, unknown>
      })

      it('contains all expected Landing keys with non-empty string values', () => {
        const filePath = path.join(WORKTREE_ROOT, 'messages', `${locale}.json`)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)
        landing = json.Landing as Record<string, unknown>

        const missing: string[] = []
        const empty: string[] = []

        for (const key of EXPECTED_LANDING_KEYS) {
          const value = resolveKey(landing, key)
          if (value === undefined) {
            missing.push(key)
          } else if (typeof value !== 'string' || value.trim().length === 0) {
            empty.push(key)
          }
        }

        if (missing.length > 0) {
          throw new Error(`Missing keys in ${locale}.json Landing:\n  ${missing.join('\n  ')}`)
        }
        if (empty.length > 0) {
          throw new Error(`Empty values in ${locale}.json Landing:\n  ${empty.join('\n  ')}`)
        }

        expect(missing).toHaveLength(0)
        expect(empty).toHaveLength(0)
      })

      it('has no extra top-level keys beyond the expected sections', () => {
        const filePath = path.join(WORKTREE_ROOT, 'messages', `${locale}.json`)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)
        landing = json.Landing as Record<string, unknown>

        const expectedSections = new Set<string>()
        for (const key of EXPECTED_LANDING_KEYS) {
          expectedSections.add(key.split('.')[0])
        }

        const actualSections = Object.keys(landing)
        for (const section of actualSections) {
          expect(expectedSections.has(section)).toBe(true)
        }
      })
    })
  }
})
