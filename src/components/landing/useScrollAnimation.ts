'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Animation CSS classes applied when an element enters the viewport.
 * Uses a two-phase approach:
 *   1. Element starts with `opacity-0 translate-y-8` (invisible, shifted down)
 *   2. On intersection, transitions to `opacity-100 translate-y-0` with a
 *      spring-like easing curve for a natural entrance feel.
 *
 * The transition is defined via inline styles so it can be customised per-element
 * without polluting the Tailwind class list.
 */
const HIDDEN_STYLE: React.CSSProperties = {
  opacity: 0,
  transform: 'translateY(2rem)',
  transition: 'none',
}

const VISIBLE_STYLE: React.CSSProperties = {
  opacity: 1,
  transform: 'translateY(0)',
  transition: 'opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
}

/** Options for configuring the scroll animation behaviour. */
interface ScrollAnimationOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.15 */
  threshold?: number
  /** Root margin string. Default: '0px 0px -60px 0px' (trigger slightly before fully visible) */
  rootMargin?: string
  /** Stagger delay in ms between sibling items. Default: 0 (no stagger) */
  staggerDelay?: number
}

/**
 * Returns a ref callback and a boolean `isVisible` flag.
 *
 * Attach the ref callback to the element you want to animate. When the element
 * enters the viewport, the hook swaps its inline styles from the hidden state
 * to the visible state, triggering the CSS transition.
 *
 * @example
 * ```tsx
 * const { ref, isVisible } = useScrollAnimation()
 * return <div ref={ref} style={isVisible ? undefined : undefined}>...</div>
 * ```
 */
export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px',
  } = options

  const elementRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const callbackRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node
  }, [])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Set initial hidden state
    Object.assign(element.style, HIDDEN_STYLE)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(element)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin])

  // Apply visible styles when isVisible flips to true
  useEffect(() => {
    const element = elementRef.current
    if (!element || !isVisible) return

    Object.assign(element.style, VISIBLE_STYLE)
  }, [isVisible])

  return { ref: callbackRef, isVisible }
}

/**
 * Manages scroll animations for a list of items with staggered entrance.
 *
 * Returns an array of ref callbacks — one per item count — so each item
 * animates in sequence with a configurable delay between them.
 *
 * @example
 * ```tsx
 * const itemRefs = useScrollAnimationItems(4, { staggerDelay: 120 })
 * return items.map((item, i) => <div key={item} ref={itemRefs[i]}>{item}</div>)
 * ```
 */
export function useScrollAnimationItems(
  count: number,
  options: ScrollAnimationOptions & { staggerDelay?: number } = {},
) {
  const { staggerDelay = 120, threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = options

  const elementRefs = useRef<(HTMLElement | null)[]>([])
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set())

  // Use useRef instead of useMemo to hold the callback array.
  // useMemo with Array.from + arrow functions triggers SWC/Turbopack
  // auto-memoization to inject useCallback inside the useMemo callback,
  // which violates the Rules of Hooks and corrupts the hook state chain.
  const callbacksRef = useRef<((node: HTMLElement | null) => void)[]>([])

  // Recreate callbacks only when count changes
  // eslint-disable-next-line react-hooks/refs
  if (callbacksRef.current.length !== count) {
    // eslint-disable-next-line react-hooks/refs
    callbacksRef.current = Array.from({ length: count }, (_, i) => (node: HTMLElement | null) => {
      elementRefs.current[i] = node
    })
  }

  useEffect(() => {
    const elements = elementRefs.current.filter(Boolean) as HTMLElement[]

    // Set initial hidden styles
    for (const el of elements) {
      Object.assign(el.style, HIDDEN_STYLE)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = elements.indexOf(entry.target as HTMLElement)
            if (index !== -1) {
              setVisibleIndices((prev) => {
                const next = new Set(prev)
                next.add(index)
                return next
              })
              observer.unobserve(entry.target)
            }
          }
        }
      },
      { threshold, rootMargin },
    )

    for (const el of elements) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [count, threshold, rootMargin])

  // Apply visible styles with stagger
  useEffect(() => {
    const elements = elementRefs.current
    for (const index of visibleIndices) {
      const el = elements[index]
      if (!el) continue

      const delay = index * staggerDelay
      // Use requestAnimationFrame to batch style changes
      setTimeout(() => {
        Object.assign(el.style, {
          ...VISIBLE_STYLE,
          transitionDelay: `${delay}ms`,
        })
      }, 0)
    }
  }, [visibleIndices, staggerDelay])

  // eslint-disable-next-line react-hooks/refs
  return callbacksRef.current
}
