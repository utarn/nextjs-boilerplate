import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatDateTime } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
    })

    it('should merge conflicting tailwind classes', () => {
      expect(cn('px-4', 'px-6')).toBe('px-6')
    })
  })

  describe('formatDate', () => {
    it('should format a date string', () => {
      const result = formatDate('2024-01-15')
      expect(result).toContain('2024')
      expect(result).toContain('Jan')
    })

    it('should format a Date object', () => {
      const result = formatDate(new Date('2024-06-15'))
      expect(result).toContain('2024')
      expect(result).toContain('Jun')
    })
  })

  describe('formatDateTime', () => {
    it('should format a date with time', () => {
      const result = formatDateTime('2024-01-15T10:30:00')
      expect(result).toContain('2024')
      expect(result).toContain('10:')
    })
  })
})
